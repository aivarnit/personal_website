#!/usr/bin/env python3
"""Allowlisted WebSocket proxy: read-only ROS subscriptions for the viewer."""

import asyncio
import json
import os

import websockets


UPSTREAM = os.environ.get("ROSBRIDGE_URL", "ws://rosbridge:9090")
PORT = int(os.environ.get("BRIDGE_PORT", "8765"))
ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "ALLOWED_WEB_ORIGINS",
        "http://localhost:8080,http://127.0.0.1:8080",
    ).split(",")
    if origin.strip()
]
ALLOWED = {
    "/camera/rgb/image_raw/compressed": "sensor_msgs/CompressedImage",
    "/odom": "nav_msgs/Odometry",
    "/scan": "sensor_msgs/LaserScan",
    "/safe_cmd_vel": "geometry_msgs/Twist",
    "/cmd_vel": "geometry_msgs/Twist",
    "/color_track/sim/status": "std_msgs/String",
}


async def handler(client, _path=None):
    try:
        upstream = await websockets.connect(UPSTREAM, max_size=1024 * 1024)
    except Exception:
        await client.close(code=1011, reason="ROS bridge is unavailable")
        return

    async def browser_to_ros():
        subscribed_topics = set()
        async for raw in client:
            try:
                message = json.loads(raw)
            except (TypeError, ValueError):
                await client.close(code=1008, reason="Invalid rosbridge message")
                return
            if not isinstance(message, dict):
                await client.close(code=1008, reason="Invalid rosbridge operation")
                return

            operation = message.get("op")
            if operation == "ping":
                outgoing = {"op": "ping"}
                identifier = message.get("id")
                if isinstance(identifier, str) and len(identifier) <= 80:
                    outgoing["id"] = identifier
                await upstream.send(json.dumps(outgoing))
                continue
            if operation not in ("subscribe", "unsubscribe"):
                await client.close(code=1008, reason="Only allowlisted subscriptions are permitted")
                return

            topic = message.get("topic")
            if not isinstance(topic, str):
                await client.close(code=1008, reason="Invalid topic")
                return
            expected_type = ALLOWED.get(topic)
            if expected_type is None:
                await client.close(code=1008, reason="Topic is not available through this demo")
                return

            if operation == "subscribe":
                if topic in subscribed_topics:
                    continue
                if len(subscribed_topics) >= len(ALLOWED):
                    await client.close(code=1008, reason="Subscription limit reached")
                    return
                subscribed_topics.add(topic)
            elif topic not in subscribed_topics:
                continue
            else:
                subscribed_topics.discard(topic)

            outgoing = {"op": operation, "topic": topic, "type": expected_type}
            identifier = message.get("id")
            if isinstance(identifier, str) and len(identifier) <= 80:
                outgoing["id"] = identifier
            if operation == "subscribe":
                try:
                    requested_throttle = int(message.get("throttle_rate", 100))
                except (TypeError, ValueError):
                    requested_throttle = 100
                outgoing["throttle_rate"] = min(10000, max(100, requested_throttle))
                outgoing["queue_length"] = 1
            await upstream.send(json.dumps(outgoing, separators=(",", ":")))

    async def ros_to_browser():
        async for raw in upstream:
            try:
                message = json.loads(raw)
            except (TypeError, ValueError):
                continue
            if not isinstance(message, dict):
                continue
            if message.get("op") == "publish" and message.get("topic") not in ALLOWED:
                continue
            await client.send(raw)

    tasks = [
        asyncio.ensure_future(browser_to_ros()),
        asyncio.ensure_future(ros_to_browser()),
    ]
    try:
        _done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
        await asyncio.gather(*pending, return_exceptions=True)
    finally:
        await upstream.close()


def main():
    loop = asyncio.get_event_loop()
    server = websockets.serve(
        handler,
        "0.0.0.0",
        PORT,
        origins=ORIGINS,
        max_size=1024 * 1024,
        ping_interval=20,
        ping_timeout=20,
    )
    loop.run_until_complete(server)
    print("Allowlisted read-only rosbridge proxy listening on {}".format(PORT), flush=True)
    loop.run_forever()


if __name__ == "__main__":
    main()
