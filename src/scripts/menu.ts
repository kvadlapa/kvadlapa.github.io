const root = document.documentElement;
const menu = document.querySelector('#mobile-menu') as HTMLDialogElement;
const opener = document.querySelector('[data-menu-open]') as HTMLButtonElement;
const closer = menu.querySelector('[data-menu-close]') as HTMLButtonElement;

opener.addEventListener('click', () => {
  // Where the visitor is when scrolling locks is where Back should return to (scroll.ts).
  history.replaceState({ ...(history.state ?? {}), y: window.scrollY }, '');
  menu.showModal();
  opener.setAttribute('aria-expanded', 'true');
  root.style.overflow = 'hidden';
});

closer.addEventListener('click', () => menu.close());

menu.addEventListener('close', () => {
  opener.setAttribute('aria-expanded', 'false');
  root.style.overflow = '';
  opener.focus();
});

// showModal leaves the browser chrome in the tab order, so wrap explicitly.
menu.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const focusable = [...menu.querySelectorAll<HTMLElement>('a[href], button')];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

// Close first (which lifts the scroll lock), then let the anchor navigate natively, so the
// history entry and Back behave exactly like the desktop nav links.
for (const link of menu.querySelectorAll<HTMLAnchorElement>('[data-menu-link]')) {
  link.addEventListener('click', () => menu.close());
}

matchMedia('(min-width: 48rem)').addEventListener('change', (event) => {
  if (event.matches && menu.open) menu.close();
});

export {};
