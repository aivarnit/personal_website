# Color-Track ROS runtime

This directory contains the isolated ROS 1 backend used by the portfolio's live Color-Track viewer. It runs the upstream `CTrack.py` and `OANode.py` files unchanged, alongside a small deterministic sensor simulator and a narrowly scoped rosbridge proxy.

## Start locally

From this directory:

```sh
docker compose up --build -d
```

Open `http://localhost:8080`, open Color-Track, and press **Start Demo**. Compose starts ROS Noetic, the lifecycle API, rosbridge, its topic filter, and the portfolio gateway. The simulator, obstacle node, and tracking node start together when the viewer requests a session. The runtime accepts one session at a time and stops it when the project dialog closes or the idle timeout expires.

To run the full closed-loop and rosbridge verification:

```sh
docker compose exec -T runtime python3 /opt/demo/verify_runtime.py
```

The verifier exercises the same filtered WebSocket path as the browser, then checks ROS messages and the real `target found` output from upstream `CTrack.py`. It stops the session when complete.

Useful commands while the stack is running:

```sh
docker compose ps
docker compose logs -f runtime rosbridge bridge-filter
docker compose exec -T runtime rostopic list
docker compose exec -T runtime rostopic echo -n 1 /camera/rgb/image_raw/header
docker compose exec -T runtime rostopic echo -n 1 /scan/header
docker compose exec -T runtime rostopic echo -n 1 /odom/header
docker compose exec -T runtime rostopic echo -n 1 /safe_cmd_vel
docker compose exec -T runtime rostopic echo -n 1 /cmd_vel
```

## Runtime details

- **ROS version:** ROS 1 Noetic on Ubuntu Focal. `CTrack.py` uses `rospy`, `CvBridge`, ROS 1 messages, and `tf.transformations`; the upstream repository has no catkin package manifest, so the source files are invoked directly with Python.
- **Upstream source:** the image clones `https://github.com/aivarnit/color-track`, checks out `COLOR_TRACK_REF` (default `main`), and saves its resolved commit to `/opt/color-track/UPSTREAM_REVISION`. Set `COLOR_TRACK_REF` in `.env` to an immutable commit hash to pin a build.
- **Headless compatibility:** `run-color-track.py` replaces only OpenCV's window creation, display, and key-read calls with no-ops. The browser displays the same frames that the source node processes. The original mask, image moments, steering rule, linear-speed choice, target threshold and `/safe_cmd_vel` output remain in `CTrack.py`.
- **Simulation:** `simulator.py` publishes 320×240 `bgr8` images on `/camera/rgb/image_raw`, JPEG representations on `/camera/rgb/image_raw/compressed`, 360 valid ranges on `/scan`, and robot pose on `/odom`. A simulated target stays at a fixed world coordinate and is rendered using BGR pixels inside the source's configured orange range. The simulator listens to the original `/cmd_vel` safety-node output; an explicit zero from `/safe_cmd_vel` also stops it immediately because the old `OANode.py` does not republish a zero twist when its input linear speed reaches zero.
- **Browser topics:** the browser receives compressed camera frames, `/odom`, `/scan`, `/safe_cmd_vel`, `/cmd_vel`, and `/color_track/sim/status`. Live path and pose come from odometry. Velocity and topic activity come from received ROS messages. Node output is captured from the actual Python processes.
- **WebSocket protocol:** the viewer speaks the rosbridge JSON protocol directly; it does not run ROS or reimplement the tracking algorithm in the browser.
- **Controls:** Pause freezes simulator integration and stops both motion nodes. Resume continues at the frozen pose. Reset restarts the simulator and both upstream nodes so their module state and trajectory return to a deterministic start. Closing the modal sends Stop.
- **Endpoint configuration:** Compose generates `js/color-track-runtime-config.js` from `COLOR_TRACK_API_URL` and `COLOR_TRACK_ROSBRIDGE_URL`. For a separate production origin, set those variables and list the portfolio origin in `ALLOWED_WEB_ORIGINS`. The static fallback uses same-origin `/api/color-track` and `/rosbridge` routes.

## Isolation and deployment

Only the gateway is published, on `127.0.0.1:8080` by default. ROS master, rosbridge and the runtime API are private on an internal Compose network. The browser proxy accepts subscriptions to a fixed topic/type allowlist, clamps subscription frequency, caps one connection at the allowed topic count, and rejects ROS publication and service calls. The API exposes fixed lifecycle actions, never accepts process names or shell commands, and runs one simulation. Containers run without privileged mode or host networking, with CPU, memory and process limits; the ROS and API roots are read-only with writable temporary storage.

The supplied Compose setup is local development configuration. For production, place the ROS services on a private container host behind a TLS reverse proxy, then add authenticated or signed session access, per-client abuse controls, and a concurrency or queue policy at the proxy. Keep ports 11311 and 9090 private. ROS Noetic reached end of life on May 31, 2025; the image is retained to execute this ROS 1 project without rewriting its algorithm. Review the [ROS project's end-of-life notice](https://discourse.ros.org/t/ros-noetic-end-of-life-may-31-2025/43160) when planning the longer-term platform.
