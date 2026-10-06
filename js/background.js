export function initializeBackground() {
  const layer = document.createElement('div');
  layer.className = 'ambient-background';
  layer.setAttribute('aria-hidden', 'true');
  document.body.prepend(layer);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  let x = innerWidth * .55, y = innerHeight * .25;
  let targetX = x, targetY = y;
  let frame = 0, previous = 0;
  function tick(time) {
    const smoothing = 1 - Math.exp(-Math.min(time - previous || 16, 50) / 160);
    previous = time;
    x += (targetX - x) * smoothing;
    y += (targetY - y) * smoothing;
    layer.style.setProperty('--ambient-x', `${x}px`);
    layer.style.setProperty('--ambient-y', `${y}px`);
    if (Math.abs(x - targetX) + Math.abs(y - targetY) > .2) frame = requestAnimationFrame(tick);
    else { frame = 0; previous = 0; }
  }
  function move(event) {
    if (event.pointerType === 'touch' || document.body.classList.contains('modal-open')) return;
    targetX = event.clientX;
    targetY = event.clientY;
    if (!frame) frame = requestAnimationFrame(tick);
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0; previous = 0;
  }
  function configure() {
    stop();
    window.removeEventListener('pointermove', move);
    const enabled = pointer.matches && !motion.matches && !document.hidden;
    layer.dataset.tracking = String(enabled);
    if (enabled) window.addEventListener('pointermove', move, { passive: true });
    else {
      layer.style.removeProperty('--ambient-x');
      layer.style.removeProperty('--ambient-y');
    }
  }
  motion.addEventListener('change', configure);
  pointer.addEventListener('change', configure);
  document.addEventListener('visibilitychange', configure);
  configure();
}
