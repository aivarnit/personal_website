const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const formatTime = value => {
  if (!Number.isFinite(value)) return '0:00';
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const readable = value => value === undefined || value === null || value === '' ? '—' : value;

// Reusable recorded-demo player. Timeline values and event times are supplied by project config.
export function ProjectDemoPlayer(config, { fallbackPoster } = {}) {
  const root = el('section', 'demo-player');
  root.setAttribute('aria-label', 'Color-Track recorded demonstration player');
  root.tabIndex = 0;

  const mediaFrame = el('div', 'demo-media-frame');
  const video = el('video', 'demo-video');
  video.preload = 'metadata';
  video.playsInline = true;
  video.setAttribute('aria-label', 'Recorded Color-Track TurtleBot demonstration');
  if (fallbackPoster) video.poster = fallbackPoster;
  if (config.media.poster) fetch(config.media.poster, { method: 'HEAD' }).then(response => {
    if (response.ok && !destroyed) video.poster = config.media.poster;
  }).catch(() => {});
  mediaFrame.append(video);

  const emptyState = el('div', 'demo-empty-state');
  emptyState.append(
    el('span', 'demo-kicker mono', 'COLOR-TRACK ROS DEMO'),
    el('strong', '', 'Demo video unavailable.'),
    el('p', '', 'Add the TurtleBot recording at /projects/color-track/demo.mp4. The player will use /projects/color-track/poster.jpg as its poster.'),
  );
  mediaFrame.append(emptyState);

  const overlayPlay = el('button', 'demo-play-overlay');
  overlayPlay.type = 'button';
  overlayPlay.setAttribute('aria-label', 'Play Demo');
  overlayPlay.append(el('span', 'demo-play-icon', '▶'), el('span', '', 'Play Demo'));
  mediaFrame.append(overlayPlay);
  root.append(mediaFrame);

  const controls = el('div', 'demo-controls');
  const controlButtons = el('div', 'demo-button-row');
  const playButton = el('button', 'demo-control demo-primary', 'Play Demo');
  playButton.type = 'button';
  const pauseButton = el('button', 'demo-control', 'Pause');
  pauseButton.type = 'button';
  const restartButton = el('button', 'demo-control', 'Restart');
  restartButton.type = 'button';
  restartButton.setAttribute('aria-label', 'Restart demonstration');
  const timeReadout = el('span', 'demo-time mono', '0:00 / 0:00');
  controlButtons.append(playButton, pauseButton, restartButton, timeReadout);
  const seek = el('input', 'demo-seek');
  seek.type = 'range';
  seek.min = '0'; seek.max = '0'; seek.step = '0.01'; seek.value = '0';
  seek.disabled = true;
  seek.setAttribute('aria-label', 'Seek in recorded Color-Track demo');
  controls.append(controlButtons, seek);
  root.append(controls);

  const stateLine = el('div', 'demo-state-line');
  stateLine.append(el('span', 'mono', 'PLAYER'), el('strong', 'demo-state-value', 'IDLE'), el('span', 'demo-recorded-label mono', 'RECORDED ROS DEMO'));
  root.append(stateLine);

  const telemetry = el('dl', 'demo-telemetry');
  const fields = [
    ['target', 'TARGET'], ['centroidX', 'CENTROID X'], ['xOffset', 'X OFFSET'],
    ['linear', 'LINEAR'], ['angular', 'ANGULAR'], ['state', 'TRACKING STATE'],
  ];
  const values = {};
  for (const [key, label] of fields) {
    const cell = el('div', 'demo-metric');
    cell.append(el('dt', 'mono', label));
    values[key] = el('dd', 'mono', '—');
    cell.append(values[key]);
    telemetry.append(cell);
  }
  root.append(telemetry);
  const telemetryNote = el('p', 'demo-telemetry-note', 'Synchronized telemetry will appear when measured timeline data is added for the recording.');
  root.append(telemetryNote);

  const technical = el('div', 'demo-technical');
  const algorithm = el('section', 'demo-algorithm');
  algorithm.append(el('h3', '', 'VISION → MOTION'));
  const linearValues = config.source.linearValues.map(value => `${value.toFixed(1)} m/s`).join(', ');
  algorithm.append(el('p', '', `OpenCV inRange mask → image moments → centroid X → proportional angular correction. Target-area metric selects linear.x from ${linearValues}.`));
  algorithm.append(el('code', 'mono', config.source.angularRule));
  algorithm.append(el('code', 'mono', `${config.source.targetAreaMetric}; A=${config.source.areaThreshold}, epi=${config.source.areaTolerance}`));
  algorithm.append(el('p', 'demo-target-colors', `Configured color ranges: ${config.colors.join(' · ')}`));
  const topicPanel = el('section', 'demo-topics');
  topicPanel.append(el('h3', '', 'ROS TOPICS'));
  const subscriptions = el('p', 'mono');
  subscriptions.append(el('span', '', 'SUB  '), document.createTextNode(config.topics.subscriptions.join('  ')));
  const publishing = el('p', 'mono');
  publishing.append(el('span', '', 'PUB  '), document.createTextNode(config.topics.publishing.join('  ')));
  topicPanel.append(subscriptions, publishing);
  technical.append(algorithm, topicPanel);
  root.append(technical);

  const consolePanel = el('details', 'demo-console');
  const consoleSummary = el('summary', '', 'ROS / rospy status output');
  const consoleContent = el('div', 'demo-console-content');
  const consoleLabel = el('p', 'mono demo-console-label', 'SYNCHRONIZED DEMO OUTPUT');
  const consoleList = el('ol', 'demo-console-list mono');
  const consoleEmpty = el('li', 'demo-console-empty', 'Console events will appear here after the recording timeline is configured.');
  consoleList.append(consoleEmpty);
  consoleContent.append(consoleLabel, consoleList);
  consolePanel.append(consoleSummary, consoleContent);
  root.append(consolePanel);

  const sourceLink = document.createElement('a');
  sourceLink.className = 'demo-source-link';
  sourceLink.href = 'https://github.com/aivarnit/color-track';
  sourceLink.target = '_blank';
  sourceLink.rel = 'noopener noreferrer';
  sourceLink.textContent = 'View Source on GitHub ↗';
  root.append(sourceLink);

  const stateValue = stateLine.querySelector('.demo-state-value');
  let state = 'idle';
  let destroyed = false;

  function activeSample(time) {
    let sample = null;
    for (const entry of config.timeline) {
      if (entry.time > time) break;
      sample = entry;
    }
    return sample;
  }

  function renderTime() {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    timeReadout.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    seek.max = String(duration);
    if (!seek.matches(':active')) seek.value = String(current);

    const sample = activeSample(current);
    if (!sample) return;
    for (const [key] of fields) values[key].textContent = readable(sample[key]);
    const events = config.consoleEvents.filter(event => event.time <= current);
    if (events.length) {
      consoleList.replaceChildren(...events.map(event => {
        const item = el('li', '');
        item.append(el('time', '', `[${formatTime(event.time)}] `), document.createTextNode(event.message));
        return item;
      }));
    } else consoleList.replaceChildren(consoleEmpty);
  }

  function setState(next) {
    state = next;
    stateValue.textContent = next.toUpperCase();
    root.dataset.state = next;
    const finished = next === 'finished';
    playButton.textContent = finished ? 'Replay' : next === 'playing' ? 'Playing' : 'Play Demo';
    playButton.disabled = !mediaReady || next === 'playing';
    pauseButton.disabled = !mediaReady || next !== 'playing';
    restartButton.disabled = !mediaReady;
    overlayPlay.hidden = next !== 'idle' || !mediaReady;
    emptyState.hidden = mediaReady;
  }

  let mediaReady = false;
  setState('idle');

  async function play() {
    if (!mediaReady || destroyed) return;
    if (state === 'finished') video.currentTime = 0;
    try {
      await video.play();
      if (!destroyed) setState('playing');
    } catch {
      setState('paused');
    }
  }
  function pause() {
    video.pause();
    if (state === 'playing') setState('paused');
  }
  function restart() {
    video.pause();
    try { video.currentTime = 0; } catch { /* Metadata may not have loaded. */ }
    renderTime();
    setState('idle');
  }
  function onPlay() { if (!destroyed) setState('playing'); }
  function onPause() { if (!destroyed && state === 'playing') setState('paused'); }
  function onEnded() { if (!destroyed) setState('finished'); }
  function onKeyDown(event) {
    if (event.code !== 'Space' || event.target !== root || !mediaReady) return;
    event.preventDefault();
    if (state === 'playing') pause(); else play();
  }

  playButton.addEventListener('click', play);
  overlayPlay.addEventListener('click', play);
  pauseButton.addEventListener('click', pause);
  restartButton.addEventListener('click', restart);
  seek.addEventListener('input', () => {
    if (Number.isFinite(video.duration)) video.currentTime = Number(seek.value);
    renderTime();
  });
  root.addEventListener('keydown', onKeyDown);
  video.addEventListener('play', onPlay);
  video.addEventListener('pause', onPause);
  video.addEventListener('ended', onEnded);
  video.addEventListener('timeupdate', renderTime);
  video.addEventListener('loadedmetadata', renderTime);
  video.addEventListener('durationchange', renderTime);

  // Do not enable controls until a real local recording is available.
  fetch(config.media.src, { method: 'HEAD' }).then(response => {
    if (!response.ok || destroyed) return;
    mediaReady = true;
    video.src = config.media.src;
    seek.disabled = false;
    setState('idle');
  }).catch(() => {});

  return {
    element: root,
    destroy() {
      destroyed = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
      root.removeEventListener('keydown', onKeyDown);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('timeupdate', renderTime);
      video.removeEventListener('loadedmetadata', renderTime);
      video.removeEventListener('durationchange', renderTime);
    },
  };
}
