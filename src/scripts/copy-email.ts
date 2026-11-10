const slot = document.querySelector<HTMLElement>('[data-copy-slot]');

if (slot && navigator.clipboard) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-secondary';
  button.textContent = 'Copy email';
  const status = document.createElement('span');
  status.className = 'sr-only';
  status.setAttribute('aria-live', 'polite');
  slot.append(button, status);

  let timer = 0;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(slot.dataset.email ?? '');
    } catch {
      status.textContent = 'Could not copy the email address';
      return;
    }
    button.textContent = 'Copied';
    status.textContent = 'Email address copied';
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      button.textContent = 'Copy email';
      status.textContent = '';
    }, 1600);
  });
}

export {};
