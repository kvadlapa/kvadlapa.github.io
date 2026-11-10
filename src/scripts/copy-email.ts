const slot = document.querySelector<HTMLElement>('[data-copy-slot]');
const email = slot?.dataset.email ?? '';

/** Clipboard API first; the textarea fallback covers embedded browsers and older Safari. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.append(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

// One visible, announced toast for every email action.
const toast = document.createElement('div');
toast.className = 'email-toast';
toast.setAttribute('role', 'status');
toast.setAttribute('aria-live', 'polite');
document.body.append(toast);
let toastTimer = 0;

function show(message: string) {
  toast.textContent = message;
  toast.dataset.open = '';
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    delete toast.dataset.open;
  }, 4000);
}

if (slot && email) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-secondary';
  button.textContent = 'Copy email';
  slot.append(button);

  let timer = 0;
  button.addEventListener('click', async () => {
    if (!(await copyText(email))) {
      show(`Could not copy. Email: ${email}`);
      return;
    }
    button.textContent = 'Copied';
    show(`Email address copied: ${email}`);
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      button.textContent = 'Copy email';
    }, 1600);
  });
}

// mailto links do nothing visible when no mail app is set up (common with webmail),
// so also copy the address and say so. The link still opens a mail app when there is one.
document.addEventListener('click', async (event) => {
  const link = (event.target as Element | null)?.closest?.('a[href^="mailto:"]');
  if (!link) return;
  const address = decodeURIComponent((link.getAttribute('href') ?? '').slice(7).split('?')[0]);
  const copied = await copyText(address);
  show(copied ? `Opening your mail app. Address copied: ${address}` : `Email: ${address}`);
});

export {};
