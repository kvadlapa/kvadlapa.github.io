const cards = [...document.querySelectorAll<HTMLElement>('[data-component]')];

let tapped: HTMLElement | null = null;
let current: HTMLElement | null = null;
let lastPointer = '';
let pointerActive = false;

function syncBranches(): void {
  for (const card of cards) {
    const branch = document.querySelector(`[data-branch="component-${card.dataset.component}"]`);
    branch?.toggleAttribute('data-lit', card === current);
  }
}

function power(card: HTMLElement | null): void {
  current = card;
  for (const other of cards) other.toggleAttribute('data-powered', other === card);
  syncBranches();
}

const canHover = matchMedia('(hover: hover)');

for (const card of cards) {
  card.addEventListener('pointerdown', (event) => {
    lastPointer = event.pointerType;
    pointerActive = true;
  });
  card.addEventListener('pointerup', () => {
    pointerActive = false;
  });
  card.addEventListener('pointercancel', () => {
    pointerActive = false;
  });
  card.addEventListener('mouseenter', () => {
    if (canHover.matches) power(card);
  });
  card.addEventListener('mouseleave', () => {
    if (canHover.matches) power(tapped);
  });
  // A tap also focuses the card, so pointer focus is left to the click handler.
  card.addEventListener('focus', () => {
    if (!pointerActive) power(card);
  });
  card.addEventListener('blur', () => power(tapped));
  card.addEventListener('click', () => {
    if (lastPointer === 'mouse') return;
    tapped = tapped === card ? null : card;
    power(tapped);
  });
}

// Rebuilding the trace recreates the branches, so restore the lit one.
document.addEventListener('trace:built', syncBranches);

export {};
