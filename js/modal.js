let activeModal = null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mediaEase = 'cubic-bezier(.22, 1, .36, 1)';

function mediaBounds(node) {
  if (!node?.isConnected || !node.getClientRects().length) return null;
  const bounds = node.getBoundingClientRect();
  if (bounds.width < 1 || bounds.height < 1 || bounds.bottom <= 0 || bounds.top >= innerHeight || bounds.right <= 0 || bounds.left >= innerWidth) return null;
  return bounds;
}

// A poster is the only moving element; players and card content stay in place.
function createSharedMedia(dialog, source, destination, poster, initialBounds = null) {
  const sourceBounds = initialBounds || mediaBounds(source);
  const destinationBounds = mediaBounds(destination);
  if (!sourceBounds || !destinationBounds || !poster?.complete || !poster.naturalWidth) return null;
  const layer = document.createElement('div');
  layer.className = 'shared-media-layer';
  layer.setAttribute('aria-hidden', 'true');
  const image = poster.cloneNode();
  image.removeAttribute('id');
  image.alt = '';
  image.loading = 'eager';
  const sourceImage = source.querySelector('img') || source;
  const imageTransform = getComputedStyle(sourceImage).transform;
  image.style.transform = imageTransform;
  layer.append(image);
  // A manual popover places the poster above the dialog without clipping it
  // to the scrollable panel. It has no controls and does not move focus.
  if (typeof layer.showPopover === 'function') layer.setAttribute('popover', 'manual');
  dialog.append(layer);
  if (layer.showPopover) layer.showPopover();
  source.classList.add('shared-media-hidden');
  destination.classList.add('shared-media-hidden');
  let animation = null;
  let imageAnimation = null;
  function frame(bounds, radius) {
    return {
      transform: `translate(${bounds.left - destinationBounds.left}px, ${bounds.top - destinationBounds.top}px) scale(${bounds.width / destinationBounds.width}, ${bounds.height / destinationBounds.height})`,
      borderRadius: radius,
    };
  }
  function radiusAt(node, bounds) {
    const style = getComputedStyle(node);
    const corners = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'];
    const radii = corners.map(corner => style[corner].split(' '));
    const pixels = (value, extent) => (parseFloat(value) || 0) * (value.endsWith('%') ? extent / 100 : 1);
    // Radius values live in the unscaled layer's coordinates. Compensate for
    // FLIP scale so the visible corners exactly match each endpoint.
    const x = radii.map(values => `${pixels(values[0], bounds.width) * destinationBounds.width / bounds.width}px`).join(' ');
    const y = radii.map(values => `${pixels(values[1] ?? values[0], bounds.height) * destinationBounds.height / bounds.height}px`).join(' ');
    return `${x} / ${y}`;
  }
  Object.assign(layer.style, {
    left: `${destinationBounds.left}px`, top: `${destinationBounds.top}px`,
    width: `${destinationBounds.width}px`, height: `${destinationBounds.height}px`,
  });
  layer.style.transform = frame(sourceBounds).transform;
  layer.style.borderRadius = radiusAt(source, sourceBounds);
  return {
    async move(opening) {
      // Sample before canceling: Escape during entry starts from the visible poster.
      const start = layer.getBoundingClientRect();
      const radius = getComputedStyle(layer).borderRadius;
      const end = mediaBounds(opening ? destination : source);
      animation?.cancel();
      if (!end) {
        animation = layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
      } else {
        animation = layer.animate([
          frame(start, radius), frame(end, radiusAt(opening ? destination : source, end)),
        ], { duration: opening ? 440 : 380, easing: mediaEase, fill: 'forwards' });
        imageAnimation?.cancel();
        imageAnimation = image.animate([{ transform: getComputedStyle(image).transform }, { transform: opening ? 'none' : imageTransform }], { duration: opening ? 440 : 380, easing: mediaEase, fill: 'forwards' });
      }
      await animation.finished.catch(() => {});
    },
    placeAtDestination() {
      animation?.cancel();
      imageAnimation?.cancel();
      layer.style.transform = 'none';
      layer.style.borderRadius = getComputedStyle(destination).borderRadius;
      image.style.transform = 'none';
    },
    cancel() {
      const transform = getComputedStyle(image).transform;
      animation?.cancel();
      imageAnimation?.cancel();
      image.style.transform = transform;
    },
    remove() {
      animation?.cancel();
      imageAnimation?.cancel();
      layer.remove();
      destination.classList.remove('shared-media-hidden');
    },
  };
}

// One lifecycle for every overlay: focus, dismissal, animation, and cleanup.
export function createModal(dialog, { onClose = () => {} } = {}) {
  let trigger = null;
  let closing = false;
  let source = null;
  let destination = null;
  let poster = null;
  let shared = null;
  let lifecycle = 0;
  let restoreOrigin = () => {};
  function releaseMedia(restoreSource = true) {
    shared?.remove();
    shared = null;
    if (restoreSource) source?.classList.remove('shared-media-hidden');
    destination?.classList.remove('shared-media-hidden');
  }
  function stopPlayers() {
    dialog.querySelectorAll('video').forEach(video => {
      video.pause();
      try { video.currentTime = 0; } catch { /* Metadata may not have loaded. */ }
    });
    // Removing an embed's URL stops playback before the closing animation.
    dialog.querySelectorAll('iframe').forEach(iframe => iframe.removeAttribute('src'));
  }
  const modal = {
    open({ origin: card = null, sourceMedia = null, destinationMedia = null, posterImage = null } = {}) {
      if (dialog.open) return;
      activeModal?.close(true);
      const cycle = ++lifecycle;
      trigger = card?.querySelector('.project-open') || document.activeElement;
      source = sourceMedia;
      destination = destinationMedia;
      poster = posterImage;
      closing = false;
      const initialBounds = mediaBounds(source);
      // Preserve the hovered card and image transforms while focus moves into
      // the dialog; neither should drift out from underneath the poster.
      const locked = [card, poster].filter(Boolean).map(node => {
        const previous = node.style.transform;
        const transform = getComputedStyle(node).transform;
        return { node, previous, transform };
      });
      locked.forEach(({ node, transform }) => { node.style.transform = transform; });
      restoreOrigin = () => locked.forEach(({ node, previous }) => { node.style.transform = previous; });
      dialog.classList.remove('is-closing');
      dialog.classList.toggle('shared-media', Boolean(source && destination && !reducedMotion.matches));
      dialog.showModal();
      dialog.scrollTop = 0;
      document.body.classList.add('modal-open');
      activeModal = modal;
      if (dialog.classList.contains('shared-media')) {
        shared = createSharedMedia(dialog, source, destination, poster, initialBounds);
        if (shared) {
          shared.move(true).then(() => {
            if (cycle !== lifecycle || closing || !dialog.open) return;
            // Same-frame handoff: reveal the real media, then remove the poster.
            releaseMedia(false);
          });
        } else dialog.classList.remove('shared-media');
      }
    },
    async close(immediate = false) {
      if (!dialog.open || (closing && !immediate)) return;
      const cycle = ++lifecycle;
      closing = true;
      stopPlayers();
      if (immediate) {
        releaseMedia();
        dialog.close();
        return;
      }
      const moving = dialog.classList.contains('shared-media') && !reducedMotion.matches;
      if (moving) {
        // On normal close the poster starts at the player's current viewport bounds.
        if (!shared) {
          shared = createSharedMedia(dialog, source, destination, poster);
          shared?.placeAtDestination();
        }
        // Keep an in-progress opening poster stationary while secondary UI fades.
        if (shared) {
          const layer = dialog.querySelector('.shared-media-layer');
          const transform = getComputedStyle(layer).transform;
          const radius = getComputedStyle(layer).borderRadius;
          shared.cancel();
          layer.style.transform = transform;
          layer.style.borderRadius = radius;
        }
      }
      if (!moving || !shared) dialog.classList.remove('shared-media');
      dialog.classList.add('is-closing');
      const fades = dialog.getAnimations({ subtree: true }).filter(animation => !animation.animationName?.startsWith('backdrop-') && !animation.effect?.target?.closest?.('.shared-media-layer'));
      await Promise.allSettled(fades.map(animation => animation.finished));
      if (cycle !== lifecycle || !dialog.open) return;
      if (shared && !reducedMotion.matches) await shared.move(false);
      if (cycle !== lifecycle || !dialog.open) return;
      releaseMedia();
      dialog.close();
    },
  };
  dialog.querySelector('.close-dialog').addEventListener('click', () => modal.close());
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    modal.close();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('a[href], button, input, select, textarea, video[controls], iframe, [tabindex]')]
      .filter(control => !control.disabled && control.tabIndex >= 0 && control.getClientRects().length && getComputedStyle(control).visibility !== 'hidden');
    const first = controls[0];
    const last = controls.at(-1);
    if (controls.length === 1 || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  });
  // Require the gesture to start and end on the backdrop, not in the content.
  let backdropPress = false;
  function outside(event) {
    const bounds = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
  }
  dialog.addEventListener('pointerdown', event => { backdropPress = outside(event); });
  dialog.addEventListener('click', event => {
    if (backdropPress && outside(event)) modal.close();
    backdropPress = false;
  });
  dialog.addEventListener('close', () => {
    ++lifecycle;
    closing = false;
    releaseMedia();
    restoreOrigin();
    restoreOrigin = () => {};
    source = destination = poster = null;
    dialog.classList.remove('is-closing', 'shared-media');
    if (activeModal === modal) activeModal = null;
    if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open');
    onClose();
    if (trigger?.isConnected && !document.querySelector('dialog[open]')) trigger.focus({ preventScroll: true });
  });
  function settleMedia() {
    // A viewport change invalidates entry geometry. Reveal the correctly laid
    // out real media immediately; closing will measure both elements afresh.
    releaseMedia(closing);
  }
  window.addEventListener('resize', settleMedia);
  dialog.addEventListener('scroll', settleMedia, { passive: true });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      settleMedia();
      dialog.classList.remove('shared-media');
    }
  });
  return modal;
}
