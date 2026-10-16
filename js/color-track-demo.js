// Keep recording paths, project facts, and recording-specific data together.
// Add measured timeline samples and console events after the video is recorded.
export const colorTrackDemo = {
  media: {
    src: '/projects/color-track/demo.mp4',
    poster: '/projects/color-track/poster.jpg',
  },
  timeline: [],
  consoleEvents: [],
  topics: {
    subscriptions: ['/odom', '/scan', '/camera/rgb/image_raw'],
    publishing: ['/safe_cmd_vel'],
  },
  colors: ['orange', 'white', 'yellow', 'black'],
  source: {
    angularRule: 'angular.z = 0.4 × (image width / 2 − centroid X) / image width',
    linearValues: [-0.1, 0, 0.1],
    areaThreshold: 40,
    areaTolerance: 10,
    targetAreaMetric: "cv2.moments(mask)['m00'] / (image height × image width)",
    cadenceHz: 10,
    goalImage: 'goal<number>.jpg',
  },
};
