#!/usr/bin/env python3
"""Small deterministic ROS sensor simulator for the original rospy nodes."""

import json
import math
import time

import cv2
import numpy as np
import rospy
from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
from sensor_msgs.msg import CompressedImage, Image, LaserScan
from std_msgs.msg import String


WIDTH = 320
HEIGHT = 240
HZ = 10.0
TARGET_X = 2.0
TARGET_Y = 0.60
TARGET_SIZE = 0.28
FOCAL_LENGTH = 245.0


class TrackSimulation:
    def __init__(self):
        self.x = 0.0
        self.y = 0.0
        self.yaw = 0.0
        self.travelled = 0.0
        self.paused = False
        self.frame = 0
        self.safe_command = Twist()
        self.robot_command = Twist()

        self.camera_pub = rospy.Publisher("/camera/rgb/image_raw", Image, queue_size=1)
        self.compressed_pub = rospy.Publisher(
            "/camera/rgb/image_raw/compressed", CompressedImage, queue_size=1
        )
        self.scan_pub = rospy.Publisher("/scan", LaserScan, queue_size=1)
        self.odom_pub = rospy.Publisher("/odom", Odometry, queue_size=1)
        self.state_pub = rospy.Publisher("/color_track/sim/status", String, queue_size=1)

        rospy.Subscriber("/safe_cmd_vel", Twist, self.on_safe_command, queue_size=1)
        rospy.Subscriber("/cmd_vel", Twist, self.on_robot_command, queue_size=1)
        rospy.Subscriber("/color_track/sim/control", String, self.on_control, queue_size=1)

    def on_safe_command(self, message):
        self.safe_command = message
        # OANode only republishes while the requested linear speed is nonzero.
        # Treat CTrack's explicit zero as a stop immediately, even though that
        # original safety node does not emit a matching zero on /cmd_vel.
        if message.linear.x == 0.0 and message.angular.z == 0.0:
            self.robot_command = Twist()

    def on_robot_command(self, message):
        self.robot_command = message

    def on_control(self, message):
        action = message.data.strip().lower()
        if action == "pause":
            self.paused = True
        elif action == "resume":
            self.paused = False
        elif action == "reset":
            self.x = 0.0
            self.y = 0.0
            self.yaw = 0.0
            self.travelled = 0.0
            self.paused = False
        rospy.loginfo("Simulation control: %s", action)

    def step(self, dt):
        if self.paused:
            self.robot_command = Twist()
            return
        linear = self.robot_command.linear.x
        angular = self.robot_command.angular.z
        self.x += linear * math.cos(self.yaw) * dt
        self.y += linear * math.sin(self.yaw) * dt
        self.yaw = math.atan2(math.sin(self.yaw + angular * dt), math.cos(self.yaw + angular * dt))
        self.travelled += abs(linear) * dt

    def render_camera(self):
        image = np.full((HEIGHT, WIDTH, 3), (217, 221, 222), dtype=np.uint8)
        horizon = 84
        cv2.rectangle(image, (0, horizon), (WIDTH, HEIGHT), (169, 174, 175), -1)
        cv2.line(image, (0, horizon), (WIDTH, horizon), (118, 124, 125), 1)
        cv2.line(image, (32, HEIGHT), (141, horizon), (237, 238, 235), 3)
        cv2.line(image, (WIDTH - 32, HEIGHT), (179, horizon), (237, 238, 235), 3)
        cv2.line(image, (WIDTH // 2, HEIGHT), (WIDTH // 2, horizon), (190, 194, 194), 1)

        dx = TARGET_X - self.x
        dy = TARGET_Y - self.y
        distance = max(math.hypot(dx, dy), 0.05)
        bearing = math.atan2(dy, dx) - self.yaw
        bearing = math.atan2(math.sin(bearing), math.cos(bearing))
        if dx > 0 and abs(bearing) < 1.35:
            center_x = int(WIDTH / 2 - FOCAL_LENGTH * math.tan(bearing))
            target_width = int(min(WIDTH * 1.2, max(2, FOCAL_LENGTH * TARGET_SIZE / distance)))
            target_height = int(min(HEIGHT * 1.2, max(2, FOCAL_LENGTH * TARGET_SIZE / distance)))
            left = center_x - target_width // 2
            top = HEIGHT - max(4, int(FOCAL_LENGTH * 0.36 / distance)) - target_height // 2
            # This BGR pixel lies inside CTrack.py's original orange range:
            # (0, 30, 75) through (5, 50, 89).
            cv2.rectangle(image, (left, top), (left + target_width, top + target_height), (3, 43, 82), -1)

        return image, distance

    def publish(self, stamp):
        quaternion_z = math.sin(self.yaw / 2.0)
        quaternion_w = math.cos(self.yaw / 2.0)

        odom = Odometry()
        odom.header.seq = self.frame
        odom.header.stamp = stamp
        odom.header.frame_id = "odom"
        odom.child_frame_id = "base_link"
        odom.pose.pose.position.x = self.x
        odom.pose.pose.position.y = self.y
        odom.pose.pose.orientation.z = quaternion_z
        odom.pose.pose.orientation.w = quaternion_w
        odom.twist.twist.linear.x = self.robot_command.linear.x
        odom.twist.twist.angular.z = self.robot_command.angular.z
        self.odom_pub.publish(odom)

        scan = LaserScan()
        scan.header.seq = self.frame
        scan.header.stamp = stamp
        scan.header.frame_id = "base_scan"
        scan.angle_min = -math.pi
        scan.angle_max = math.pi
        scan.angle_increment = (2.0 * math.pi) / 360.0
        scan.time_increment = 0.0
        scan.scan_time = 1.0 / HZ
        scan.range_min = 0.12
        scan.range_max = 8.0
        scan.ranges = [8.0] * 360
        scan.intensities = []
        self.scan_pub.publish(scan)

        camera, target_distance = self.render_camera()
        image = Image()
        image.header.seq = self.frame
        image.header.stamp = stamp
        image.header.frame_id = "camera_rgb_optical_frame"
        image.height = HEIGHT
        image.width = WIDTH
        image.encoding = "bgr8"
        image.is_bigendian = 0
        image.step = WIDTH * 3
        image.data = camera.tobytes()
        self.camera_pub.publish(image)

        encoded_ok, encoded = cv2.imencode(".jpg", camera, [cv2.IMWRITE_JPEG_QUALITY, 78])
        if encoded_ok:
            compressed = CompressedImage()
            compressed.header = image.header
            compressed.format = "jpeg"
            compressed.data = encoded.tobytes()
            self.compressed_pub.publish(compressed)

        self.state_pub.publish(String(data=json.dumps({
            "frame": self.frame,
            "x": round(self.x, 4),
            "y": round(self.y, 4),
            "yaw": round(self.yaw, 4),
            "target_x": TARGET_X,
            "target_y": TARGET_Y,
            "distance_to_target": round(target_distance, 4),
            "distance_travelled": round(self.travelled, 4),
            "paused": self.paused,
            "safe_linear_x": round(self.safe_command.linear.x, 4),
            "safe_angular_z": round(self.safe_command.angular.z, 4),
            "cmd_linear_x": round(self.robot_command.linear.x, 4),
            "cmd_angular_z": round(self.robot_command.angular.z, 4),
        })))


def main():
    rospy.init_node("color_track_simulator")
    simulation = TrackSimulation()
    rospy.loginfo("Publishing 320x240 BGR camera, 360-ray scan and odometry at %.0f Hz", HZ)
    previous = time.monotonic()
    rate = rospy.Rate(HZ)
    while not rospy.is_shutdown():
        now = time.monotonic()
        dt = max(0.0, min(now - previous, 0.25))
        previous = now
        simulation.step(dt)
        simulation.publish(rospy.Time.now())
        simulation.frame += 1
        rate.sleep()


if __name__ == "__main__":
    main()
