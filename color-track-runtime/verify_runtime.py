#!/usr/bin/env python3
"""Start a demo and verify its real ROS loop and filtered browser WebSocket."""

import asyncio
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request

import websockets


BASE = os.environ.get("DEMO_API_BASE", "http://gateway/api/color-track")
BRIDGE = os.environ.get("DEMO_ROSBRIDGE_URL", "ws://bridge-filter:8765")
ORIGIN = os.environ.get("DEMO_BROWSER_ORIGIN", "http://localhost:8080")
EXPECTED = {
    "/camera/rgb/image_raw/compressed": "sensor_msgs/CompressedImage",
    "/odom": "nav_msgs/Odometry",
    "/scan": "sensor_msgs/LaserScan",
    "/safe_cmd_vel": "geometry_msgs/Twist",
    "/cmd_vel": "geometry_msgs/Twist",
    "/color_track/sim/status": "std_msgs/String",
}


def get_status():
    with urllib.request.urlopen(BASE + "/status", timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))


def post(path):
    request = urllib.request.Request(BASE + path, data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))


async def verify_bridge():
    received = set()
    message_counts = {topic: 0 for topic in EXPECTED}
    camera_frames = set()
    socket = None
    connection_error = None
    for _attempt in range(30):
        try:
            socket = await websockets.connect(BRIDGE, origin=ORIGIN, max_size=1024 * 1024)
            break
        except (OSError, websockets.exceptions.WebSocketException) as error:
            connection_error = error
            await asyncio.sleep(0.5)
    if socket is None:
        raise RuntimeError("Could not connect to the filtered rosbridge WebSocket: {}".format(connection_error))

    async with socket:
        for index, (topic, message_type) in enumerate(EXPECTED.items()):
            await socket.send(json.dumps({
                "op": "subscribe",
                "id": "verify-{}".format(index),
                "topic": topic,
                "type": message_type,
                "throttle_rate": 100,
                "queue_length": 1,
            }))
        deadline = time.monotonic() + 90
        last_poll = 0.0
        status = {}
        while time.monotonic() < deadline:
            try:
                raw = await asyncio.wait_for(socket.recv(), timeout=0.25)
                message = json.loads(raw)
                if message.get("op") == "publish" and message.get("topic") in message_counts:
                    topic = message["topic"]
                    received.add(topic)
                    message_counts[topic] += 1
                    if topic == "/camera/rgb/image_raw/compressed":
                        camera_frames.add(hashlib.sha256(message["msg"]["data"].encode("ascii")).digest())
            except asyncio.TimeoutError:
                pass

            if time.monotonic() - last_poll > 1.0:
                status = await asyncio.get_event_loop().run_in_executor(None, get_status)
                last_poll = time.monotonic()
                if status.get("state") in ("complete", "error"):
                    break

        if status.get("state") != "complete":
            raise RuntimeError("ROS demo did not complete successfully: {}".format(status.get("error") or status.get("state")))
        if received != set(EXPECTED):
            raise RuntimeError("rosbridge did not deliver all allowed topics: {}".format(sorted(set(EXPECTED) - received)))
        if message_counts["/camera/rgb/image_raw/compressed"] < 10:
            raise RuntimeError("rosbridge camera stream did not deliver enough live frames")
        if len(camera_frames) < 2:
            raise RuntimeError("camera frames did not change while the simulator moved")
        return status, message_counts


def main():
    try:
        post("/start")
        status, bridge_counts = asyncio.run(verify_bridge())
        topics = status["topics"]
        required_ros = ("/camera/rgb/image_raw", "/scan", "/odom", "/safe_cmd_vel", "/cmd_vel")
        for topic in required_ros:
            if topics[topic]["messages"] <= 0:
                raise RuntimeError("ROS node did not receive/publish {}".format(topic))
        if status["nonzero_commands"]["safe"] <= 0 or status["nonzero_commands"]["robot"] <= 0:
            raise RuntimeError("The original tracking/safety nodes did not publish nonzero motion commands")
        if status["simulation"]["distance_travelled"] < 0.5:
            raise RuntimeError("Robot pose did not change in response to ROS motion commands")
        if not any("target found" in entry["message"] for entry in status["logs"]):
            raise RuntimeError("Original CTrack.py did not report reaching the target")
        print("Color-Track closed-loop verification passed")
        print("Upstream revision: {}".format(status.get("upstream_revision")))
        print("Simulator pose: x={:.3f} m, y={:.3f} m".format(status["simulation"]["x"], status["simulation"]["y"]))
        print("Distance travelled: {:.3f} m".format(status["simulation"]["distance_travelled"]))
        print("Final target distance: {:.3f} m".format(status["simulation"]["distance_to_target"]))
        for topic in sorted(bridge_counts):
            print("rosbridge {:40s} {} messages".format(topic, bridge_counts[topic]))
    except Exception as error:
        print("Verification failed: {}".format(error), file=sys.stderr)
        sys.exit(1)
    finally:
        try:
            post("/stop")
        except Exception:
            pass


if __name__ == "__main__":
    main()
