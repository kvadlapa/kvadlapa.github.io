if (matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let queued = false;
  let card: HTMLElement | null = null;
  let x = 0;
  let y = 0;

  document.querySelector('#projects')?.addEventListener('pointermove', (event) => {
    const { target, clientX, clientY } = event as PointerEvent;
    card = (target as Element).closest<HTMLElement>('[data-glow]');
    x = clientX;
    y = clientY;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!card) return;
      const box = card.getBoundingClientRect();
      card.style.setProperty('--glow-x', `${x - box.left}px`);
      card.style.setProperty('--glow-y', `${y - box.top}px`);
    });
  });
}

export {};
