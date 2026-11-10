(function () {
  var stored = null;
  try {
    stored = localStorage.getItem('theme');
  } catch (e) {}
  var light = stored ? stored === 'light' : matchMedia('(prefers-color-scheme: light)').matches;
  var root = document.documentElement;
  root.dataset.theme = light ? 'light' : 'dark';
  root.dataset.js = '';
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', light ? '#F4F1EA' : '#0B1218');
})();
