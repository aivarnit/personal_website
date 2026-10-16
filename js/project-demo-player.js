import { colorTrackRuntime } from './color-track-runtime.js?v=7';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const formatNumber = (value, digits = 2) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';

function yawFromQuaternion(q = {}) {
  const { x = 0, y = 0, z = 0, w = 1 } = q;
  return Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
}

export function ProjectDemoPlayer(config) {
  const root = el('section', 'demo-player');
  root.setAttribute('aria-label', 'Live Color-Track ROS demonstration');

  const heading = el('div', 'demo-heading');
  heading.append(
    el('div', '', 'LIVE COLOR-TRACK DEMO'),
    el('span', 'mono demo-runtime-version', 'ROS 1 / NOETIC'),
  );
  root.append(heading);

  const visuals = el('div', 'demo-visuals');
  const cameraPanel = el('figure', 'demo-camera-panel');
  const cameraTitle = el('figcaption', 'demo-panel-heading');
  cameraTitle.append(el('span', '', 'SIMULATED CAMERA'), el('span', 'mono', '/camera/rgb/image_raw'));
  const cameraViewport = el('div', 'demo-camera-viewport');
  const camera = el('img', 'demo-camera-image');
  camera.alt = 'Live camera images published to the ROS camera topic';
  camera.decoding = 'async';
  const cameraMessage = el('div', 'demo-camera-message');
  const cameraMessageTitle = el('strong', '', 'Checking ROS runtime');
  const cameraMessageText = el('p', '', 'Waiting for the backend status response.');
  cameraMessage.append(cameraMessageTitle, cameraMessageText);
  cameraViewport.append(camera, cameraMessage);
  cameraPanel.append(cameraTitle, cameraViewport);

  const mapPanel = el('figure', 'demo-map-panel');
  const mapTitle = el('figcaption', 'demo-panel-heading');
  mapTitle.append(el('span', '', 'SIMULATED WORLD'), el('span', 'mono', 'POSE FROM /odom'));
  const map = el('canvas', 'demo-map');
  map.width = 480;
  map.height = 300;
  map.setAttribute('role', 'img');
  map.setAttribute('aria-label', 'Top-down map using live robot odometry');
  mapPanel.append(mapTitle, map);
  visuals.append(cameraPanel, mapPanel);
  root.append(visuals);

  const controls = el('div', 'demo-controls');
  const buttons = el('div', 'demo-button-row');
  const startButton = el('button', 'demo-control demo-primary', 'Start Demo');
  startButton.type = 'button';
  const pauseButton = el('button', 'demo-control', 'Pause');
  pauseButton.type = 'button';
  pauseButton.disabled = true;
  const resetButton = el('button', 'demo-control', 'Reset');
  resetButton.type = 'button';
  resetButton.disabled = true;
  buttons.append(startButton, pauseButton, resetButton);
  const statusLine = el('div', 'demo-live-status');
  statusLine.setAttribute('role', 'status');
  statusLine.setAttribute('aria-live', 'polite');
  const bridgeStatus = el('span', 'demo-status-pill mono', 'ROSBRIDGE DISCONNECTED');
  const runtimeStatus = el('span', 'demo-status-pill mono', 'RUNTIME CHECKING');
  const nodeStatus = el('span', 'demo-status-pill mono', 'COLOR-TRACK OFFLINE');
  statusLine.append(bridgeStatus, runtimeStatus, nodeStatus);
  const notice = el('p', 'demo-notice', 'The isolated ROS runtime starts when you press Start Demo.');
  controls.append(buttons, statusLine, notice);
  root.append(controls);

  const telemetry = el('dl', 'demo-telemetry');
  const values = {};
  for (const [key, label, initial] of [
    ['target', 'TARGET RANGE', '—'],
    ['x', 'ODOM X', '—'],
    ['y', 'ODOM Y', '—'],
    ['yaw', 'HEADING', '—'],
    ['linear', 'SAFE LINEAR X', '—'],
    ['angular', 'SAFE ANGULAR Z', '—'],
  ]) {
    const cell = el('div', 'demo-metric');
    cell.append(el('dt', 'mono', label));
    values[key] = el('dd', 'mono', initial);
    cell.append(values[key]);
    telemetry.append(cell);
  }
  root.append(telemetry);

  const technical = el('div', 'demo-technical');
  const algorithm = el('section', 'demo-algorithm');
  algorithm.append(
    el('h3', '', 'LIVE ROS PIPELINE'),
    el('p', '', 'The original Python node receives each BGR image, thresholds its configured target color with OpenCV, measures image moments and publishes its velocity command.'),
    el('code', 'mono', config.source.angularRule),
    el('code', 'mono', `${config.source.targetAreaMetric}; A=${config.source.areaThreshold}, epi=${config.source.areaTolerance}`),
    el('p', 'demo-target-colors', `Color ranges in the source: ${config.colors.join(' · ')}`),
  );
  const topicPanel = el('section', 'demo-topics');
  topicPanel.append(el('h3', '', 'ROS TOPICS'));
  const topicList = el('ul', 'demo-topic-list');
  const topicBadges = {};
  config.topics.display.forEach(topic => {
    const item = el('li', 'demo-topic');
    const label = el('span', 'mono', topic.label);
    const name = el('code', 'mono', topic.topic);
    topicBadges[topic.key] = el('span', 'mono demo-topic-state', 'WAITING');
    item.append(label, name, topicBadges[topic.key]);
    topicList.append(item);
  });
  topicPanel.append(topicList);
  technical.append(algorithm, topicPanel);
  root.append(technical);

  const consolePanel = el('details', 'demo-console');
  const consoleSummary = el('summary', '', 'Live ROS node output');
  const consoleList = el('ol', 'demo-console-list mono');
  consoleList.append(el('li', 'demo-console-empty', 'Runtime logs will appear here when the ROS session starts.'));
  consolePanel.append(consoleSummary, consoleList);
  root.append(consolePanel);

  const sourceLink = document.createElement('a');
  sourceLink.className = 'demo-source-link';
  sourceLink.href = 'https://github.com/aivarnit/color-track';
  sourceLink.target = '_blank';
  sourceLink.rel = 'noopener noreferrer';
  sourceLink.textContent = 'View Source on GitHub ↗';
  root.append(sourceLink);

  let destroyed = false;
  let apiReachable = false;
  let currentState = 'offline';
  let sessionStarted = false;
  let bridge = null;
  let reconnectTimer = null;
  let pollTimer = null;
  let previousSequence = -1;
  let latestOdom = null;
  let lastHeartbeatAt = 0;
  let targetPosition = { x: 2.0, y: 0.6 };
  let path = [];

  const apiEndpoint = action => `${colorTrackRuntime.apiBase.replace(/\/$/, '')}/${action}`;

  function setBridge(connected, label = '') {
    bridgeStatus.textContent = label || `ROSBRIDGE ${connected ? 'CONNECTED' : 'DISCONNECTED'}`;
    bridgeStatus.dataset.state = connected ? 'active' : 'idle';
  }

  function setError(message) {
    notice.textContent = message;
    notice.dataset.state = 'error';
  }

  function renderMap() {
    const context = map.getContext('2d');
    const width = map.width;
    const height = map.height;
    const range = { minX: -0.35, maxX: 2.9, minY: -0.65, maxY: 1.85 };
    const scale = Math.min(width / (range.maxX - range.minX), height / (range.maxY - range.minY));
    const offsetX = (width - (range.maxX - range.minX) * scale) / 2;
    const offsetY = (height - (range.maxY - range.minY) * scale) / 2;
    const point = (x, y) => ({
      x: offsetX + (x - range.minX) * scale,
      y: height - offsetY - (y - range.minY) * scale,
    });

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#17191a';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = '#343638';
    context.lineWidth = 1;
    for (let x = Math.ceil(range.minX); x <= range.maxX; x += 0.5) {
      const a = point(x, range.minY);
      const b = point(x, range.maxY);
      context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
    }
    for (let y = Math.ceil(range.minY / 0.5) * 0.5; y <= range.maxY; y += 0.5) {
      const a = point(range.minX, y);
      const b = point(range.maxX, y);
      context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
    }

    context.strokeStyle = '#919696';
    context.lineWidth = 1.5;
    context.setLineDash([6, 5]);
    context.beginPath();
    context.moveTo(point(range.minX, 0).x, point(range.minX, 0).y);
    context.lineTo(point(range.maxX, 0).x, point(range.maxX, 0).y);
    context.stroke();
    context.setLineDash([]);

    if (path.length > 1) {
      context.strokeStyle = '#d88942';
      context.lineWidth = 2;
      context.beginPath();
      path.forEach((pose, index) => {
        const current = point(pose.x, pose.y);
        if (index === 0) context.moveTo(current.x, current.y);
        else context.lineTo(current.x, current.y);
      });
      context.stroke();
    }

    const target = point(targetPosition.x, targetPosition.y);
    context.fillStyle = '#d88942';
    context.beginPath(); context.arc(target.x, target.y, 7, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#f0c189';
    context.beginPath(); context.arc(target.x, target.y, 11, 0, Math.PI * 2); context.stroke();

    if (latestOdom) {
      const robot = point(latestOdom.x, latestOdom.y);
      const direction = { x: Math.cos(latestOdom.yaw), y: Math.sin(latestOdom.yaw) };
      context.save();
      context.translate(robot.x, robot.y);
      context.rotate(-Math.atan2(direction.y, direction.x));
      context.fillStyle = '#e9e8e4';
      context.beginPath(); context.moveTo(12, 0); context.lineTo(-8, -7); context.lineTo(-6, 0); context.lineTo(-8, 7); context.closePath(); context.fill();
      context.restore();
    }
  }

  function updateOdom(message) {
    const position = message.pose?.pose?.position;
    const orientation = message.pose?.pose?.orientation;
    if (!position) return;
    latestOdom = { x: Number(position.x) || 0, y: Number(position.y) || 0, yaw: yawFromQuaternion(orientation) };
    path.push(latestOdom);
    if (path.length > 1200) path = path.slice(-1200);
    values.x.textContent = `${formatNumber(latestOdom.x)} m`;
    values.y.textContent = `${formatNumber(latestOdom.y)} m`;
    values.yaw.textContent = `${formatNumber(latestOdom.yaw)} rad`;
    renderMap();
  }

  function updateSimulation(message) {
    try {
      const state = JSON.parse(message.data);
      targetPosition = { x: Number(state.target_x), y: Number(state.target_y) };
      values.target.textContent = `${formatNumber(state.distance_to_target)} m`;
      renderMap();
    } catch {
      // Ignore malformed diagnostics; odometry and command data remain live.
    }
  }

  function handleRosMessage(message) {
    if (message.op !== 'publish') return;
    switch (message.topic) {
      case '/camera/rgb/image_raw/compressed': {
        const image = message.msg;
        if (!image?.data || (image.header?.seq === previousSequence && previousSequence >= 0)) return;
        previousSequence = image.header?.seq ?? previousSequence + 1;
        camera.src = `data:image/jpeg;base64,${image.data}`;
        cameraMessage.hidden = true;
        break;
      }
      case '/odom':
        updateOdom(message.msg);
        break;
      case '/safe_cmd_vel':
        values.linear.textContent = `${formatNumber(message.msg?.linear?.x)} m/s`;
        values.angular.textContent = `${formatNumber(message.msg?.angular?.z)} rad/s`;
        break;
      case '/color_track/sim/status':
        updateSimulation(message.msg);
        break;
      default:
        break;
    }
  }

  function connectBridge() {
    if (destroyed) return;
    if (typeof WebSocket === 'undefined') {
      setBridge(false, 'WEBSOCKET UNAVAILABLE');
      return;
    }
    if (bridge?.readyState === WebSocket.OPEN || bridge?.readyState === WebSocket.CONNECTING) return;
    setBridge(false, 'ROSBRIDGE CONNECTING');
    try {
      bridge = new WebSocket(colorTrackRuntime.rosbridgeUrl);
      bridge.addEventListener('open', () => {
        setBridge(true);
        config.topics.subscriptions.forEach(subscription => {
          bridge.send(JSON.stringify({
            op: 'subscribe',
            id: `color-track-${subscription.key}`,
            topic: subscription.topic,
            type: subscription.type,
            throttle_rate: subscription.throttleRate,
            queue_length: 1,
          }));
        });
      });
      bridge.addEventListener('message', event => {
        try { handleRosMessage(JSON.parse(event.data)); } catch { /* Ignore non-JSON frames. */ }
      });
      bridge.addEventListener('close', () => {
        setBridge(false);
        if (!destroyed && sessionStarted && currentState !== 'offline' && currentState !== 'complete') {
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connectBridge, 1800);
        }
      });
      bridge.addEventListener('error', () => setBridge(false, 'ROSBRIDGE CONNECTION ERROR'));
    } catch {
      setBridge(false, 'ROSBRIDGE CONNECTION ERROR');
    }
  }

  function renderTopics(status) {
    for (const topic of config.topics.display) {
      const source = status?.topics?.[topic.activityTopic];
      const active = Boolean(source?.active);
      topicBadges[topic.key].textContent = active
        ? 'ACTIVE'
        : ['paused', 'complete'].includes(currentState) && source?.messages ? 'QUIET' : 'WAITING';
      topicBadges[topic.key].dataset.state = active ? 'active' : 'idle';
    }
  }

  function renderLogs(entries = []) {
    if (!entries.length) {
      consoleList.replaceChildren(el('li', 'demo-console-empty', 'No runtime output has been received yet.'));
      return;
    }
    consoleList.replaceChildren(...entries.slice(-80).map(entry => {
      const line = el('li', '');
      line.append(el('time', '', `[${entry.time}] `), document.createTextNode(entry.message));
      return line;
    }));
    consoleList.scrollTop = consoleList.scrollHeight;
  }

  function renderStatus(status) {
    const previousState = currentState;
    currentState = status.state || 'offline';
    if (currentState === 'offline' && previousState !== 'offline') {
      previousSequence = -1;
      camera.removeAttribute('src');
      cameraMessage.hidden = false;
    }
    root.dataset.state = currentState;
    apiReachable = true;
    runtimeStatus.textContent = status.ros_master ? 'ROS MASTER CONNECTED' : 'ROS MASTER DISCONNECTED';
    runtimeStatus.dataset.state = status.ros_master ? 'active' : 'error';
    const nodeRunning = Boolean(status.nodes?.['color-track']?.running);
    nodeStatus.textContent = currentState === 'complete'
      ? 'TARGET REACHED'
      : currentState === 'paused'
        ? 'COLOR-TRACK PAUSED'
        : currentState === 'error'
          ? 'RUNTIME ERROR'
          : nodeRunning ? 'COLOR-TRACK RUNNING' : `COLOR-TRACK ${currentState.toUpperCase()}`;
    nodeStatus.dataset.state = currentState === 'running' || currentState === 'complete' ? 'active' : currentState === 'error' ? 'error' : 'idle';

    const busy = Boolean(status.busy);
    startButton.disabled = busy || currentState === 'starting' || currentState === 'running';
    startButton.textContent = currentState === 'paused' ? 'Resume Demo' : currentState === 'complete' ? 'Replay Demo' : 'Start Demo';
    pauseButton.disabled = busy || currentState !== 'running';
    resetButton.disabled = busy || currentState === 'offline';
    renderTopics(status);
    renderLogs(status.logs);

    if (status.simulation) updateSimulation({ data: JSON.stringify(status.simulation) });
    if (currentState === 'offline') {
      cameraMessageTitle.textContent = 'ROS demo ready';
      cameraMessageText.textContent = 'Press Start Demo to stream the camera frames consumed by CTrack.py.';
      notice.textContent = 'The isolated ROS runtime is ready. Press Start Demo to launch one session.';
      notice.dataset.state = '';
    } else if (currentState === 'starting') {
      cameraMessageTitle.textContent = 'Starting ROS';
      cameraMessageText.textContent = 'Waiting for the first camera frame from the simulator.';
      notice.textContent = 'Starting the simulator and original rospy nodes; waiting for live commands.';
      notice.dataset.state = '';
    } else if (currentState === 'running') {
      cameraMessageTitle.textContent = 'Waiting for camera frame';
      cameraMessageText.textContent = 'The runtime is publishing camera data from the active ROS session.';
      notice.textContent = 'Live camera, odometry and motion commands are arriving from ROS.';
      notice.dataset.state = '';
    } else if (currentState === 'paused') {
      cameraMessageTitle.textContent = 'Simulation paused';
      cameraMessageText.textContent = 'Resume to continue the live ROS session.';
      notice.textContent = 'The simulator is paused and the motion nodes are stopped. Resume to continue.';
      notice.dataset.state = '';
    } else if (currentState === 'complete') {
      cameraMessageTitle.textContent = 'Target reached';
      cameraMessageText.textContent = 'CTrack.py found the target and published a stop command.';
      notice.textContent = 'CTrack.py found the target and published a stop command.';
      notice.dataset.state = '';
    } else if (currentState === 'error') {
      cameraMessageTitle.textContent = 'ROS runtime error';
      cameraMessageText.textContent = status.error || 'Check the live runtime output below.';
      setError(status.error || 'The ROS runtime reported an error. Check the live node output below.');
    }
  }

  async function refreshStatus() {
    if (destroyed) return;
    try {
      const response = await fetch(apiEndpoint('status'), { cache: 'no-store' });
      if (!response.ok) throw new Error(`Runtime API returned ${response.status}`);
      renderStatus(await response.json());
      if (['starting', 'running', 'pausing', 'paused', 'complete'].includes(currentState)) {
        sessionStarted = true;
        connectBridge();
      } else {
        sessionStarted = false;
        if (bridge) {
          bridge.close(1000, 'ROS session is no longer active');
          bridge = null;
        }
        setBridge(false);
      }
    } catch (error) {
      apiReachable = false;
      runtimeStatus.textContent = 'RUNTIME UNAVAILABLE';
      runtimeStatus.dataset.state = 'error';
      nodeStatus.textContent = 'COLOR-TRACK OFFLINE';
      nodeStatus.dataset.state = 'error';
      if (!camera.complete || !camera.naturalWidth) {
        cameraMessageTitle.textContent = 'Runtime unavailable';
        cameraMessageText.textContent = 'Start the Docker Compose stack, then try again.';
        cameraMessage.hidden = false;
      }
      startButton.disabled = false;
      pauseButton.disabled = true;
      resetButton.disabled = true;
      setError('Could not reach the Color-Track runtime API. Start the Docker Compose stack, then try again.');
      if (!sessionStarted) currentState = 'offline';
      if (error?.name !== 'AbortError') console.warn('Color-Track runtime status unavailable:', error.message);
    }
  }

  async function sendAction(action) {
    if (destroyed) return;
    startButton.disabled = true;
    pauseButton.disabled = true;
    resetButton.disabled = true;
    if (action === 'start') {
      if (['complete', 'error'].includes(currentState)) {
        path = [];
        latestOdom = null;
        previousSequence = -1;
        cameraMessage.hidden = false;
        camera.removeAttribute('src');
        cameraMessageTitle.textContent = 'Starting ROS';
        cameraMessageText.textContent = 'Waiting for the first camera frame from the simulator.';
        renderMap();
      }
      sessionStarted = true;
      cameraMessageTitle.textContent = 'Starting ROS';
      cameraMessageText.textContent = 'Waiting for the first camera frame from the simulator.';
      connectBridge();
    }
    try {
      const response = await fetch(apiEndpoint(action), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const status = await response.json();
      if (!response.ok && response.status !== 409) throw new Error(status.error || `Runtime action returned ${response.status}`);
      renderStatus(status);
      if (action === 'reset') {
        path = [];
        latestOdom = null;
        previousSequence = -1;
        cameraMessage.hidden = false;
        camera.removeAttribute('src');
        renderMap();
      }
      if (action === 'stop') sessionStarted = false;
    } catch (error) {
      setError(error.message || 'The runtime did not accept that action.');
      startButton.disabled = false;
      resetButton.disabled = !apiReachable;
    }
    await refreshStatus();
  }

  startButton.addEventListener('click', () => sendAction('start'));
  pauseButton.addEventListener('click', () => sendAction('pause'));
  resetButton.addEventListener('click', () => sendAction('reset'));
  root.addEventListener('pointerdown', () => {
    const now = Date.now();
    if (!sessionStarted || now - lastHeartbeatAt < 15000) return;
    lastHeartbeatAt = now;
    fetch(apiEndpoint('heartbeat'), { method: 'POST', keepalive: true }).catch(() => {});
  });
  renderMap();
  refreshStatus();
  pollTimer = setInterval(refreshStatus, 1000);

  return {
    element: root,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearInterval(pollTimer);
      clearTimeout(reconnectTimer);
      if (bridge) {
        bridge.close(1000, 'Project dialog closed');
        bridge = null;
      }
      if (sessionStarted) {
        fetch(apiEndpoint('stop'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
          keepalive: true,
        }).catch(() => {});
      }
      root.replaceChildren();
    },
  };
}
