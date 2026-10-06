let activeModal = null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// One lifecycle for every overlay: focus, dismissal, animation, and cleanup.
export function createModal(dialog, { onClose = () => {} } = {}) {
  let trigger = null;
  let closing = false;
  let origin = null;
  let originBounds = null;
  let viewport = null;
  let expansion = null;
  function inverse(card, surface) {
    return `translate(${card.left - surface.left}px, ${card.top - surface.top}px) scale(${card.width / surface.width}, ${card.height / surface.height})`;
  }
  function canReturn() {
    if (!origin?.isConnected || dialog.scrollTop > 2 || !viewport || viewport.width !== innerWidth || viewport.height !== innerHeight) return false;
    const bounds = origin.getBoundingClientRect();
    return bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth &&
      Math.abs(bounds.width - originBounds.width) < 2 && Math.abs(bounds.height - originBounds.height) < 2;
  }

  const modal = {
    open({ origin: card = null } = {}) {
      if (dialog.open) return;
      activeModal?.close(true);
      trigger = card?.querySelector('.project-open') || document.activeElement;
      origin = card;
      originBounds = card?.getBoundingClientRect();
      viewport = { width: innerWidth, height: innerHeight };
      const shared = originBounds && !reducedMotion.matches && typeof dialog.animate === 'function';
      dialog.classList.toggle('shared-expansion', Boolean(shared));
      closing = false;
      dialog.classList.remove('is-closing');
      dialog.showModal();
      dialog.scrollTop = 0;
      document.body.classList.add('modal-open');
      activeModal = modal;
      if (shared) {
        const surface = dialog.getBoundingClientRect();
        expansion = dialog.animate([
          { transform: inverse(originBounds, surface), opacity: .9 },
          { transform: 'none', opacity: 1 },
        ], { duration: 400, easing: 'cubic-bezier(.22, 1, .36, 1)' });
      }
    },
    async close(immediate = false) {
      if (!dialog.open || (closing && !immediate)) return;
      closing = true;
      const startTransform = getComputedStyle(dialog).transform;
      expansion?.cancel();
      if (!immediate && !reducedMotion.matches) {
        const shared = dialog.classList.contains('shared-expansion') && canReturn();
        dialog.classList.toggle('shared-expansion', shared);
        dialog.classList.add('is-closing');
        if (shared) {
          const surface = dialog.getBoundingClientRect();
          expansion = dialog.animate([
            { transform: startTransform, opacity: 1 },
            { transform: inverse(origin.getBoundingClientRect(), surface), opacity: .75 },
          ], { duration: 300, delay: 60, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' });
        }
        const animations = dialog.getAnimations().filter(animation => animation.effect?.target === dialog);
        await Promise.allSettled(animations.map(animation => animation.finished));
      }
      if (dialog.open) dialog.close();
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
      .filter(control => !control.disabled && control.tabIndex >= 0 && control.getClientRects().length);
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
    closing = false;
    expansion?.cancel();
    expansion = null;
    origin = null;
    dialog.classList.remove('is-closing', 'shared-expansion');
    if (activeModal === modal) activeModal = null;
    if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open');
    onClose();
    if (trigger?.isConnected && !document.querySelector('dialog[open]')) trigger.focus({ preventScroll: true });
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) expansion?.cancel();
  });
  return modal;
}
