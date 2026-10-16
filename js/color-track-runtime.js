const deploymentConfig = window.COLOR_TRACK_RUNTIME_CONFIG || {};
const apiBase = deploymentConfig.apiUrl || deploymentConfig.apiBase || '/api/color-track';
const socketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const rosbridgeUrl = deploymentConfig.rosbridgeUrl || `${socketProtocol}//${window.location.host}/rosbridge`;

export const colorTrackRuntime = { apiBase, rosbridgeUrl };
