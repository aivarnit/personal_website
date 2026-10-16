#!/usr/bin/env python3
"""Single-session lifecycle API for the isolated Color-Track ROS runtime."""

import json
import os
import signal
import subprocess
import sys
import threading
import time
from collections import deque

import rospy
from flask import Flask, Response, jsonify, request
from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
from sensor_msgs.msg import Image, LaserScan
from std_msgs.msg import String


HERE = "/opt/demo"
SOURCE = "/opt/color-track"
TOPICS = {
    "/camera/rgb/image_raw": "camera",
    "/scan": "lidar",
    "/odom": "odometry",
    "/safe_cmd_vel": "safe_command",
    "/cmd_vel": "robot_command",
    "/color_track/sim/status": "simulation",
}


class RuntimeManager:
    def __init__(self):
        self.state_lock = threading.RLock()
        self.action_lock = threading.Lock()
        self.state = "offline"
        self.error = None
        self.busy = False
        self.start_is_resume = False
        self.stop_requested = False
        self.processes = {}
        self.output_readers = {}
        self.logs = deque(maxlen=160)
        self.topic_last = {name: 0.0 for name in TOPICS}
        self.topic_count = {name: 0 for name in TOPICS}
        self.last_safe = {"linear_x": 0.0, "angular_z": 0.0}
        self.last_robot = {"linear_x": 0.0, "angular_z": 0.0}
        self.nonzero_commands = {"safe": 0, "robot": 0}
        self.simulation = None
        self.last_activity = time.monotonic()
        self.tracker_started_at = 0.0
        self.idle_timeout = max(60, int(os.environ.get("IDLE_TIMEOUT_SECONDS", "600")))
        self.allowed_origins = {
            origin.strip()
            for origin in os.environ.get(
                "ALLOWED_WEB_ORIGINS",
                "http://localhost:8080,http://127.0.0.1:8080",
            ).split(",")
            if origin.strip()
        }

        self.sim_control_pub = rospy.Publisher("/color_track/sim/control", String, queue_size=1)
        self.safe_pub = rospy.Publisher("/safe_cmd_vel", Twist, queue_size=1)
        self.cmd_pub = rospy.Publisher("/cmd_vel", Twist, queue_size=1)
        rospy.Subscriber("/camera/rgb/image_raw", Image, self._topic_callback, callback_args="camera", queue_size=1)
        rospy.Subscriber("/scan", LaserScan, self._topic_callback, callback_args="lidar", queue_size=1)
        rospy.Subscriber("/odom", Odometry, self._topic_callback, callback_args="odometry", queue_size=1)
        rospy.Subscriber("/safe_cmd_vel", Twist, self._safe_callback, queue_size=1)
        rospy.Subscriber("/cmd_vel", Twist, self._robot_callback, queue_size=1)
        rospy.Subscriber("/color_track/sim/status", String, self._simulation_callback, queue_size=1)

        self._log("ROS runtime API connected to the ROS master")
        threading.Thread(target=self._monitor, name="runtime-monitor", daemon=True).start()

    def _log(self, message):
        stamp = time.strftime("%H:%M:%S", time.localtime())
        with self.state_lock:
            self.logs.append({"time": stamp, "message": str(message)[:500]})

    def _topic_callback(self, _message, key):
        name = next(topic for topic, value in TOPICS.items() if value == key)
        with self.state_lock:
            self.topic_last[name] = time.monotonic()
            self.topic_count[name] += 1

    def _safe_callback(self, message):
        with self.state_lock:
            self.topic_last["/safe_cmd_vel"] = time.monotonic()
            self.topic_count["/safe_cmd_vel"] += 1
            self.last_safe = {
                "linear_x": round(message.linear.x, 4),
                "angular_z": round(message.angular.z, 4),
            }
            if message.linear.x != 0.0 or message.angular.z != 0.0:
                self.nonzero_commands["safe"] += 1

    def _robot_callback(self, message):
        with self.state_lock:
            self.topic_last["/cmd_vel"] = time.monotonic()
            self.topic_count["/cmd_vel"] += 1
            self.last_robot = {
                "linear_x": round(message.linear.x, 4),
                "angular_z": round(message.angular.z, 4),
            }
            if message.linear.x != 0.0 or message.angular.z != 0.0:
                self.nonzero_commands["robot"] += 1

    def _simulation_callback(self, message):
        try:
            state = json.loads(message.data)
        except (TypeError, ValueError):
            return
        with self.state_lock:
            self.topic_last["/color_track/sim/status"] = time.monotonic()
            self.topic_count["/color_track/sim/status"] += 1
            self.simulation = state

    def _read_output(self, name, process, finished):
        try:
            for line in iter(process.stdout.readline, ""):
                line = line.rstrip()
                if line:
                    self._log("{}: {}".format(name, line))
        finally:
            finished.set()

    def _launch(self, name, command):
        env = os.environ.copy()
        env["ROS_MASTER_URI"] = os.environ.get("ROS_MASTER_URI", "http://ros-master:11311")
        env["ROS_HOME"] = "/tmp/ros"
        env["PYTHONUNBUFFERED"] = "1"
        process = subprocess.Popen(
            command,
            cwd=HERE if name == "simulator" else "/tmp",
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            start_new_session=True,
        )
        done = threading.Event()
        reader = threading.Thread(target=self._read_output, args=(name, process, done), daemon=True)
        with self.state_lock:
            self.processes[name] = process
            self.output_readers[name] = done
        reader.start()
        self._log("Started {} (pid {})".format(name, process.pid))
        return process

    def _terminate(self, name):
        with self.state_lock:
            process = self.processes.pop(name, None)
        if process is None or process.poll() is not None:
            return
        try:
            os.killpg(process.pid, signal.SIGTERM)
            process.wait(timeout=0.6)
        except (ProcessLookupError, subprocess.TimeoutExpired):
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            try:
                process.wait(timeout=1.0)
            except subprocess.TimeoutExpired:
                pass
        self._log("Stopped {}".format(name))

    def _publish_stop(self):
        stop = Twist()
        self.safe_pub.publish(stop)
        self.cmd_pub.publish(stop)

    def _stop_nodes(self):
        self._terminate("color-track")
        self._terminate("obstacle-avoidance")
        self._publish_stop()

    def _stop_everything(self):
        self.sim_control_pub.publish(String(data="pause"))
        self._stop_nodes()
        self._terminate("simulator")

    def _reset_measurements(self):
        with self.state_lock:
            for name in self.topic_last:
                self.topic_last[name] = 0.0
                self.topic_count[name] = 0
            self.last_safe = {"linear_x": 0.0, "angular_z": 0.0}
            self.last_robot = {"linear_x": 0.0, "angular_z": 0.0}
            self.nonzero_commands = {"safe": 0, "robot": 0}
            self.simulation = None

    def _wait_for_sensors(self, timeout=10.0):
        required = ("/camera/rgb/image_raw", "/scan", "/odom")
        end = time.monotonic() + timeout
        while time.monotonic() < end and not rospy.is_shutdown():
            with self.state_lock:
                ready = all(self.topic_last[name] > 0.0 for name in required)
            if ready:
                return True
            time.sleep(0.1)
        return False

    def enqueue(self, action):
        with self.state_lock:
            if self.busy:
                if action == "stop":
                    self.stop_requested = True
                return self.snapshot(), 202
            if action == "start" and self.state in ("starting", "running"):
                return self.snapshot(), 200
            if action == "pause" and self.state not in ("starting", "running"):
                return self.snapshot(), 409
            if action in ("reset", "stop") and self.state == "offline" and action == "stop":
                return self.snapshot(), 200
            self.busy = True
            self.start_is_resume = action == "start" and self.state == "paused"
            if action == "start" or action == "reset":
                self.state = "starting"
            elif action == "pause":
                self.state = "pausing"
            elif action == "stop":
                self.state = "stopping"
            self.error = None
            self.last_activity = time.monotonic()
        threading.Thread(target=self._perform, args=(action,), name="runtime-{}".format(action), daemon=True).start()
        return self.snapshot(), 202

    def _perform(self, action):
        try:
            with self.action_lock:
                if action == "start":
                    self._start()
                elif action == "pause":
                    self._pause()
                elif action == "reset":
                    self._reset()
                elif action == "stop":
                    self._stop()
        except Exception as error:  # Surface launch failures to the viewer and logs.
            self._log("Runtime action failed: {}".format(error))
            self._stop_everything()
            with self.state_lock:
                self.state = "error"
                self.error = str(error)
        finally:
            with self.state_lock:
                self.busy = False
                stop_requested = self.stop_requested
                self.stop_requested = False
            if stop_requested:
                self.enqueue("stop")

    def _start_nodes(self):
        self._launch("obstacle-avoidance", [sys.executable, os.path.join(SOURCE, "OANode.py")])
        time.sleep(1.15)
        with self.state_lock:
            process = self.processes.get("obstacle-avoidance")
            if process is None or process.poll() is not None:
                raise RuntimeError("OANode.py did not stay running")
        self.tracker_started_at = time.monotonic()
        self._launch("color-track", [sys.executable, os.path.join(HERE, "run-color-track.py")])

    def _start(self):
        with self.state_lock:
            resume = self.start_is_resume
            self.start_is_resume = False
        if resume:
            self.sim_control_pub.publish(String(data="resume"))
            self._reset_control_activity()
            self._start_nodes()
            self._log("Resumed the simulator and original ROS nodes")
            return

        self._stop_everything()
        with self.state_lock:
            self.logs.clear()
        self._reset_measurements()
        self._reset_control_activity()
        simulator = self._launch("simulator", [sys.executable, os.path.join(HERE, "simulator.py")])
        if not self._wait_for_sensors():
            raise RuntimeError("Camera, scan and odometry did not all produce ROS messages")
        if simulator.poll() is not None:
            raise RuntimeError("The simulator exited during sensor startup")
        self._start_nodes()
        self._log("Original CTrack.py and OANode.py are attached to live simulation topics")

    def _reset_control_activity(self):
        with self.state_lock:
            self.topic_last["/safe_cmd_vel"] = 0.0
            self.topic_last["/cmd_vel"] = 0.0
            self.topic_count["/safe_cmd_vel"] = 0
            self.topic_count["/cmd_vel"] = 0
            self.last_safe = {"linear_x": 0.0, "angular_z": 0.0}
            self.last_robot = {"linear_x": 0.0, "angular_z": 0.0}
            self.nonzero_commands = {"safe": 0, "robot": 0}

    def _pause(self):
        self.sim_control_pub.publish(String(data="pause"))
        self._stop_nodes()
        with self.state_lock:
            self.state = "paused"
        self._log("Paused the simulator and stopped both motion nodes")

    def _reset(self):
        self._stop_everything()
        with self.state_lock:
            self.logs.clear()
        self._reset_measurements()
        self._reset_control_activity()
        simulator = self._launch("simulator", [sys.executable, os.path.join(HERE, "simulator.py")])
        if not self._wait_for_sensors():
            raise RuntimeError("Sensors did not restart after reset")
        if simulator.poll() is not None:
            raise RuntimeError("The simulator exited during reset")
        self._start_nodes()
        self._log("Reset the robot, target view, trajectory and Color-Track process")

    def _stop(self):
        self._stop_everything()
        self._reset_measurements()
        with self.state_lock:
            self.state = "offline"
            self.error = None
        self._log("Stopped the single Color-Track demo session")

    def heartbeat(self):
        with self.state_lock:
            self.last_activity = time.monotonic()

    @staticmethod
    def _ros_master_available():
        try:
            code, _message, _pid = rospy.get_master().getPid("/color_track_runtime_api")
            return code == 1
        except Exception:
            return False

    def snapshot(self):
        now = time.monotonic()
        with self.state_lock:
            nodes = {}
            for name in ("simulator", "obstacle-avoidance", "color-track"):
                process = self.processes.get(name)
                nodes[name] = {
                    "running": process is not None and process.poll() is None,
                    "pid": process.pid if process is not None and process.poll() is None else None,
                }
            topics = {}
            for name, key in TOPICS.items():
                last = self.topic_last[name]
                age = round(now - last, 2) if last else None
                topics[name] = {
                    "active": age is not None and age < 2.0,
                    "messages": self.topic_count[name],
                    "age_seconds": age,
                    "role": key,
                }
            return {
                "state": self.state,
                "ros_master": self._ros_master_available(),
                "error": self.error,
                "busy": self.busy,
                "nodes": nodes,
                "topics": topics,
                "commands": {"safe": dict(self.last_safe), "robot": dict(self.last_robot)},
                "nonzero_commands": dict(self.nonzero_commands),
                "simulation": dict(self.simulation) if self.simulation else None,
                "logs": list(self.logs),
                "upstream_revision": self._upstream_revision(),
            }

    @staticmethod
    def _upstream_revision():
        try:
            with open(os.path.join(SOURCE, "UPSTREAM_REVISION"), "r", encoding="utf-8") as revision_file:
                return revision_file.read().strip()
        except OSError:
            return None

    def _monitor(self):
        while not rospy.is_shutdown():
            time.sleep(0.25)
            with self.state_lock:
                state = self.state
                tracker = self.processes.get("color-track")
                obstacle_avoidance = self.processes.get("obstacle-avoidance")
                simulator = self.processes.get("simulator")
                tracker_reader = self.output_readers.get("color-track")
                tracker_started = self.tracker_started_at
                safe_at = self.topic_last["/safe_cmd_vel"]
                sensor_times = [self.topic_last[topic] for topic in ("/camera/rgb/image_raw", "/scan", "/odom")]

            if state == "starting":
                if simulator is not None and simulator.poll() is not None:
                    self._fail("The simulator process exited")
                    continue
                if obstacle_avoidance is not None and obstacle_avoidance.poll() is not None:
                    self._fail("OANode.py exited during startup")
                    continue
                if tracker is not None and tracker.poll() is not None:
                    if tracker_reader is not None and not tracker_reader.is_set():
                        continue
                    if self._log_contains("target found"):
                        with self.state_lock:
                            self.state = "complete"
                        self._log("Color-Track reached its target and stopped")
                    else:
                        self._fail("CTrack.py exited before reporting a reached target")
                    continue
                if tracker is not None and tracker.poll() is None and safe_at > 0 and time.monotonic() - safe_at < 2.0:
                    with self.state_lock:
                        if self.state == "starting":
                            self.state = "running"
                    self._log("CTrack.py is publishing /safe_cmd_vel")
                elif tracker is not None and tracker_started and time.monotonic() - tracker_started > 15.0 and safe_at == 0:
                    self._fail("CTrack.py started but has not published /safe_cmd_vel")
            elif state == "running":
                if simulator is None or simulator.poll() is not None:
                    self._fail("The simulator stopped while the demo was running")
                elif obstacle_avoidance is None or obstacle_avoidance.poll() is not None:
                    self._fail("OANode.py stopped while the demo was running")
                elif tracker is not None and tracker.poll() is not None:
                    if tracker_reader is not None and not tracker_reader.is_set():
                        continue
                    if self._log_contains("target found"):
                        with self.state_lock:
                            self.state = "complete"
                        self._log("Color-Track reached its target and stopped")
                    else:
                        self._fail("CTrack.py stopped unexpectedly")
                elif any(stamp == 0 or time.monotonic() - stamp > 3.0 for stamp in sensor_times):
                    self._fail("A required sensor topic stopped publishing")
                elif safe_at == 0 or time.monotonic() - safe_at > 3.0:
                    self._fail("CTrack.py stopped publishing /safe_cmd_vel")

            with self.state_lock:
                current = self.state
                idle = time.monotonic() - self.last_activity > self.idle_timeout
            if current in ("running", "paused", "complete") and idle:
                with self.action_lock:
                    with self.state_lock:
                        still_idle = (
                            self.state in ("running", "paused", "complete")
                            and time.monotonic() - self.last_activity > self.idle_timeout
                        )
                    if still_idle:
                        self._log("Idle timeout reached; stopping the demo session")
                        self._stop()

    def _log_contains(self, text):
        with self.state_lock:
            return any(text in entry["message"] for entry in self.logs)

    def _fail(self, message):
        self._log(message)
        self._stop_everything()
        with self.state_lock:
            self.state = "error"
            self.error = message


rospy.init_node("color_track_runtime_api", anonymous=False, disable_signals=True)
manager = RuntimeManager()
app = Flask(__name__)
action_times = {}
action_lock = threading.Lock()


@app.before_request
def check_origin_and_preflight():
    origin = request.headers.get("Origin")
    if origin and origin not in manager.allowed_origins:
        return jsonify({"error": "Origin is not allowed"}), 403
    if request.method == "OPTIONS":
        return Response(status=204)
    return None


@app.after_request
def add_browser_headers(response):
    origin = request.headers.get("Origin")
    if origin and origin in manager.allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Vary"] = "Origin"
    response.headers["Cache-Control"] = "no-store"
    return response


def action_response(action):
    peer = request.remote_addr or "unknown"
    now = time.monotonic()
    with action_lock:
        recent = [stamp for stamp in action_times.get(peer, []) if now - stamp < 10.0]
        if len(recent) >= 8:
            return jsonify({"error": "Demo controls are rate limited"}), 429
        recent.append(now)
        action_times[peer] = recent
    payload, status = manager.enqueue(action)
    return jsonify(payload), status


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"healthy": not rospy.is_shutdown(), "ros_master": manager._ros_master_available()})


@app.route("/api/color-track/status", methods=["GET"])
def status():
    return jsonify(manager.snapshot())


@app.route("/api/color-track/start", methods=["POST"])
def start():
    return action_response("start")


@app.route("/api/color-track/pause", methods=["POST"])
def pause():
    return action_response("pause")


@app.route("/api/color-track/reset", methods=["POST"])
def reset():
    return action_response("reset")


@app.route("/api/color-track/stop", methods=["POST"])
def stop():
    return action_response("stop")


@app.route("/api/color-track/heartbeat", methods=["POST"])
def heartbeat():
    manager.heartbeat()
    return Response(status=204)


if __name__ == "__main__":
    def shutdown(_signum, _frame):
        with manager.action_lock:
            manager._stop_everything()
        rospy.signal_shutdown("runtime API is stopping")
        raise SystemExit(0)

    signal.signal(signal.SIGTERM, shutdown)
    app.run(host="0.0.0.0", port=8000, threaded=True, use_reloader=False)
