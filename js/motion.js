export function initializeMotion() {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const items = new Set();
  function add(node, delay = 0) {
    if (!node) return;
    node.classList.add('reveal-item');
    node.style.setProperty('--reveal-delay', `${delay}ms`);
    items.add(node);
  }
  // Project cards stay static: focus return must never replay a reveal on them.
  // Observe individual elements in the remaining sections.
  document.querySelectorAll('.section-label, .section-heading, .about-layout > *, .education, .subheading, .gallery-heading, .contact-layout > *').forEach(node => add(node));
  document.querySelectorAll('.principles, .skills-grid, #experience-list, .certification-grid').forEach(group => {
    [...group.children].forEach((node, index) => add(node, (index % 3) * 65));
  });
  let observer;
  function applyPreference() {
    observer?.disconnect();
    if (preference.matches || !('IntersectionObserver' in window)) {
      document.body.classList.remove('motion-ready');
      items.forEach(node => node.classList.add('is-visible'));
      return;
    }
    document.body.classList.add('motion-ready');
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
    items.forEach(node => { if (!node.classList.contains('is-visible')) observer.observe(node); });
  }
  applyPreference();
  preference.addEventListener('change', applyPreference);
  // Focus and anchor navigation should expose content immediately.
  document.addEventListener('focusin', event => {
    const item = event.target.closest('.reveal-item');
    item?.classList.add('is-visible');
  });
}
