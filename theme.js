(function () {
  const THEME_KEY = 'untitledTheme';
  const root = document.documentElement;

  function normalize(value) {
    return value === 'light' ? 'light' : 'dark';
  }

  function readTheme() {
    try {
      return normalize(localStorage.getItem(THEME_KEY));
    } catch (e) {
      return 'dark';
    }
  }

  let theme = readTheme();

  function applyTheme(next) {
    theme = normalize(next);
    root.dataset.theme = theme;

    const light = theme === 'light';
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.setAttribute('aria-pressed', String(light));
      button.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');

      const label = button.querySelector('[data-theme-label]');
      if (label) label.textContent = light ? 'Light mode' : 'Dark mode';

      const icon = button.querySelector('[data-theme-icon]');
      if (icon) icon.textContent = light ? '☀️' : '🌙';
    });
  }

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {
      console.warn('Could not save theme:', e);
    }
    applyTheme(next);
  }

  function init() {
    applyTheme(theme);
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.addEventListener('click', toggleTheme);
    });
  }

  applyTheme(theme);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('storage', event => {
    if (event.key === THEME_KEY) applyTheme(event.newValue);
  });
})();
