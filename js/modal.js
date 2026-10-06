let activeModal = null;

// One lifecycle for every overlay: focus, dismissal, and immediate cleanup.
export function createModal(dialog, { onClose = () => {} } = {}) {
  let trigger = null;

  function cleanup() {
    if (!trigger) return;
    const returnFocus = trigger;
    trigger = null;
    if (activeModal === modal) activeModal = null;
    if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open');
    onClose();
    if (returnFocus.isConnected && !document.querySelector('dialog[open]')) returnFocus.focus({ preventScroll: true });
  }

  const modal = {
    open({ origin: card = null } = {}) {
      if (dialog.open) return;
      activeModal?.close();
      trigger = card?.querySelector('.project-open') || document.activeElement;
      dialog.showModal();
      dialog.scrollTop = 0;
      document.body.classList.add('modal-open');
      activeModal = modal;
    },
    close() {
      if (!dialog.open) return;
      dialog.querySelectorAll('video').forEach(video => {
        video.pause();
        try { video.currentTime = 0; } catch { /* Metadata may not have loaded. */ }
      });
      dialog.querySelectorAll('iframe').forEach(iframe => iframe.removeAttribute('src'));
      dialog.close();
      // Clean up synchronously so a rapid reopen cannot be cleared by an old close event.
      cleanup();
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
    if (!dialog.open) cleanup();
  });
  return modal;
}
