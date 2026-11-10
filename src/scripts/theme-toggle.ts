const root = document.documentElement;
const button = document.querySelector('[data-theme-toggle]') as HTMLButtonElement;
const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

// The theme the visitor has asked for. Updated synchronously on every press, so N quick presses
// always land on the parity-correct theme even while a flip's deferred update is still pending.
let intended = root.dataset.theme === 'light' ? 'light' : 'dark';
let transition: ViewTransition | null = null;

function sync(): void {
  const light = intended === 'light';
  button.setAttribute('aria-pressed', `${light}`);
  meta.content = light ? '#F4F1EA' : '#0B1218';
}

function apply(): void {
  root.dataset.theme = intended;
}

function press(): void {
  intended = intended === 'light' ? 'dark' : 'light';
  try {
    localStorage.setItem('theme', intended);
  } catch {
    // Storage can be blocked. The choice still applies to this page view.
  }
  sync();

  if (transition) {
    // A flip is running: finish it now and land on the latest choice instead of queueing another.
    transition.skipTransition();
    apply();
    return;
  }
  if (!document.startViewTransition || reduce.matches) {
    apply();
    return;
  }
  const current = document.startViewTransition(apply);
  transition = current;
  current.finished.finally(() => {
    if (transition === current) transition = null;
  });
}

sync();
button.addEventListener('click', press);

// While a flip runs, Chrome hit-tests nothing but <html> (even elementFromPoint returns it, and
// pointer-events on the ::view-transition pseudos does not change that). So a click that lands on
// <html> mid-flip finishes the flip, then is re-dispatched to whatever is really under the pointer:
// any link, button or the toggle itself, with no per-control wiring.
document.addEventListener(
  'click',
  (event) => {
    if (!transition || event.target !== root || !event.isTrusted) return;
    const running = transition;
    const { clientX, clientY } = event;
    running.skipTransition();
    running.finished.finally(() => {
      const hit = document.elementFromPoint(clientX, clientY);
      if (!hit || hit === root || hit === document.body) return;
      hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX, clientY, view: window }));
    });
  },
  true,
);

export {};
