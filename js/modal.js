let activeModal = null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// One lifecycle for every overlay: focus, dismissal, animation, and cleanup.
export function createModal(dialog, { onClose = () => {} } = {}) {
  let trigger = null;
  let closing = false;

  const modal = {
    open() {
      if (dialog.open) return;
      activeModal?.close(true);
      trigger = document.activeElement;
      closing = false;
      dialog.classList.remove('is-closing');
      dialog.showModal();
      dialog.scrollTop = 0;
      document.body.classList.add('modal-open');
      activeModal = modal;
    },
    async close(immediate = false) {
      if (!dialog.open || (closing && !immediate)) return;
      closing = true;
      if (!immediate && !reducedMotion.matches) {
        dialog.classList.add('is-closing');
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
    dialog.classList.remove('is-closing');
    if (activeModal === modal) activeModal = null;
    if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open');
    onClose();
    if (trigger?.isConnected && !document.querySelector('dialog[open]')) trigger.focus({ preventScroll: true });
  });
  return modal;
}
