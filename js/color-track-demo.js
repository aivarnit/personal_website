// Facts and topic contracts from the original ROS 1 repository. The values
// displayed by the player arrive from the live runtime, not a timeline.
export const colorTrackDemo = {
  topics: {
    subscriptions: [
      { key: 'camera', topic: '/camera/rgb/image_raw/compressed', type: 'sensor_msgs/CompressedImage', throttleRate: 100 },
      { key: 'odometry', topic: '/odom', type: 'nav_msgs/Odometry', throttleRate: 100 },
      { key: 'lidar', topic: '/scan', type: 'sensor_msgs/LaserScan', throttleRate: 250 },
      { key: 'safe', topic: '/safe_cmd_vel', type: 'geometry_msgs/Twist', throttleRate: 100 },
      { key: 'robot', topic: '/cmd_vel', type: 'geometry_msgs/Twist', throttleRate: 100 },
      { key: 'simulation', topic: '/color_track/sim/status', type: 'std_msgs/String', throttleRate: 100 },
    ],
    display: [
      { key: 'camera', label: 'CAMERA', topic: '/camera/rgb/image_raw', activityTopic: '/camera/rgb/image_raw' },
      { key: 'odometry', label: 'ODOMETRY', topic: '/odom', activityTopic: '/odom' },
      { key: 'lidar', label: 'LIDAR', topic: '/scan', activityTopic: '/scan' },
      { key: 'safe', label: 'TRACKER OUTPUT', topic: '/safe_cmd_vel', activityTopic: '/safe_cmd_vel' },
      { key: 'robot', label: 'ROBOT COMMAND', topic: '/cmd_vel', activityTopic: '/cmd_vel' },
    ],
  },
  colors: ['orange', 'white', 'yellow', 'black'],
  source: {
    angularRule: 'angular.z = 0.4 × (image width / 2 − centroid X) / image width',
    areaThreshold: 40,
    areaTolerance: 10,
    targetAreaMetric: "cv2.moments(mask)['m00'] / (image height × image width)",
    cadenceHz: 10,
  },
};
