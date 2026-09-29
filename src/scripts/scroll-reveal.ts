const REVEAL_SELECTOR = '.reveal-up, .reveal-fade';

function revealAll(): void {
  document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((el) => {
    el.classList.add('revealed');
  });
}

export function initScrollReveal(): void {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    revealAll();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.1,
    }
  );

  document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((el) => {
    observer.observe(el);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollReveal);
} else {
  initScrollReveal();
}
