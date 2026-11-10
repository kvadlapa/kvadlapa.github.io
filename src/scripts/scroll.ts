import { lengthAt, onRebuildNeeded, rebuild, trace } from './trace.ts';

const root = document.documentElement;
const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
const contactStatus = document.querySelector<HTMLElement>('[data-contact-status]');
const tip = document.querySelector('[data-trace-tip]') as SVGGElement;

let oxidation = -1;
let queued = false;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function drawTrace(progress: number): void {
  const tipY = window.scrollY + root.clientHeight * (0.62 + 0.38 * progress ** 4) - trace.mainTop;
  const length = lengthAt(tipY);

  trace.live.style.strokeDashoffset = `${trace.total - length}`;
  const point = trace.live.getPointAtLength(length);
  tip.setAttribute('transform', `translate(${point.x} ${point.y})`);

  const reach = 10 * parseFloat(getComputedStyle(root).fontSize);
  for (const branch of trace.branches) {
    if (branch.scrollDrawn) {
      branch.el.style.strokeDashoffset = `${branch.length * (1 - clamp((tipY - branch.y) / reach, 0, 1))}`;
    }
  }
  for (const via of trace.vias) via.el.toggleAttribute('data-passed', tipY >= via.y);

  if (contactStatus?.dataset.status === 'pending' && (progress >= 0.985 || length >= trace.total - 2)) {
    contactStatus.dataset.status = 'granted';
    contactStatus.dataset.landed = '';
  }
}

function frame(): void {
  queued = false;
  const range = root.scrollHeight - root.clientHeight;
  const progress = range > 0 ? clamp(window.scrollY / range, 0, 1) : 1;

  const next = Math.round(progress * 50) / 50;
  if (next !== oxidation) {
    oxidation = next;
    root.style.setProperty('--oxidation', `${next}`);
  }
  if (motion) drawTrace(progress);
}

function requestFrame(): void {
  if (queued) return;
  queued = true;
  requestAnimationFrame(frame);
}

function drawAll(): void {
  trace.live.style.strokeDashoffset = '0';
  for (const branch of trace.branches) {
    if (branch.scrollDrawn) branch.el.style.strokeDashoffset = '0';
  }
  for (const via of trace.vias) via.el.toggleAttribute('data-passed', true);
}

function refresh(): void {
  rebuild();
  if (motion) trace.live.style.strokeDasharray = `${trace.total}`;
  else drawAll();
  frame();
}

if (motion && contactStatus) contactStatus.dataset.status = 'pending';

// A printout is the finished page: land the contact status before printing.
function grantForPrint(): void {
  if (contactStatus) contactStatus.dataset.status = 'granted';
}
window.addEventListener('beforeprint', grantForPrint);
matchMedia('print').addEventListener('change', (event) => {
  if (event.matches) grantForPrint();
});
refresh();
onRebuildNeeded(refresh);
window.addEventListener('scroll', requestFrame, { passive: true });

// Back/Forward return to where the visitor was reading in that entry, at once and without a glide.
// - Each entry's position is saved in history.state whenever scrolling settles (scrollend), and
//   just before an in-page link leaves it. Nothing is saved while the menu locks scrolling; the
//   menu saves the position it locked at (menu.ts).
// - On a traversal, Chrome scrolls to the entry's #fragment after popstate, and html's smooth
//   scroll-behavior turns that into a glide. So smooth scrolling is switched off for the restore,
//   and the saved position is applied again after the browser's fragment scroll.
// Chrome also fires popstate for the link click itself; that navigation keeps its smooth scroll.
let lastAnchorClick = -Infinity;

function saveEntry(): void {
  if (root.style.overflow === 'hidden') return;
  history.replaceState({ ...(history.state ?? {}), y: window.scrollY }, '');
}

const hasScrollEnd: boolean = 'onscrollend' in window;
if (hasScrollEnd) {
  window.addEventListener('scrollend', saveEntry);
} else {
  let settle = 0;
  window.addEventListener('scroll', () => {
    clearTimeout(settle);
    settle = window.setTimeout(saveEntry, 150);
  }, { passive: true });
}

document.addEventListener(
  'click',
  (event) => {
    const link = (event.target as Element).closest('a[href^="#"]');
    if (!link) return;
    lastAnchorClick = event.timeStamp;
    if (!link.closest('dialog')) saveEntry();
  },
  true,
);

window.addEventListener('popstate', (event) => {
  if (event.timeStamp - lastAnchorClick < 100) return;
  const saved = (event.state as { y?: number } | null)?.y;
  const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  const restore = () => {
    if (typeof saved === 'number') window.scrollTo({ top: saved, behavior: 'instant' });
    else if (target) target.scrollIntoView({ behavior: 'instant' });
    else window.scrollTo({ top: 0, behavior: 'instant' });
  };
  root.style.scrollBehavior = 'auto';
  restore();
  window.addEventListener('hashchange', restore, { once: true });
  requestAnimationFrame(() => {
    restore();
    requestAnimationFrame(() => {
      restore();
      window.setTimeout(() => {
        window.removeEventListener('hashchange', restore);
        root.style.scrollBehavior = '';
      }, 150);
    });
  });
});

const links = new Map(
  [...document.querySelectorAll<HTMLAnchorElement>('.nav-link')].map((link) => [link.hash.slice(1), link]),
);
const spy = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const link = links.get(entry.target.id);
      if (!link) continue;
      if (entry.isIntersecting) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  },
  { rootMargin: '-45% 0px -54% 0px' },
);
for (const id of links.keys()) spy.observe(document.getElementById(id) as HTMLElement);
