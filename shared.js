(function () {
  const formatterCache = {};

  let dialogEl = null;
  let dialogTitleEl = null;
  let dialogDescriptionEl = null;
  let dialogStatusEl = null;
  let lastFocused = null;

  function GetNumberFormatter(options) {
    const key = JSON.stringify(options);
    if (!formatterCache[key]) {
      formatterCache[key] = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
        ...options
      });
    }
    return formatterCache[key];
  }

  function FormatNumber(value, options = {}) {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    return GetNumberFormatter(options).format(number);
  }

  function EnsureAchievementDialog() {
    if (dialogEl) return dialogEl;

    dialogEl = document.createElement('div');
    dialogEl.id = 'achievementDialog';
    dialogEl.className = 'achievement-dialog';
    dialogEl.hidden = true;
    dialogEl.innerHTML = `
      <div class="achievement-dialog-panel" role="dialog" aria-modal="true"
        aria-labelledby="achievementDialogTitle" aria-describedby="achievementDialogDescription">
        <button class="achievement-dialog-close" type="button" aria-label="Close achievement details">×</button>
        <p class="achievement-dialog-eyebrow">Achievement</p>
        <h2 id="achievementDialogTitle"></h2>
        <p class="achievement-dialog-description" id="achievementDialogDescription"></p>
        <p class="achievement-dialog-status" id="achievementDialogStatus"></p>
      </div>`;

    document.body.appendChild(dialogEl);

    dialogTitleEl = dialogEl.querySelector('#achievementDialogTitle');
    dialogDescriptionEl = dialogEl.querySelector('#achievementDialogDescription');
    dialogStatusEl = dialogEl.querySelector('#achievementDialogStatus');

    dialogEl.querySelector('.achievement-dialog-close').addEventListener('click', CloseAchievementDialog);
    dialogEl.addEventListener('click', event => {
      if (event.target === dialogEl) CloseAchievementDialog();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !dialogEl.hidden) {
        event.preventDefault();
        CloseAchievementDialog();
      }
    });

    return dialogEl;
  }

  function OpenAchievementDialog(achievement, earned) {
    EnsureAchievementDialog();

    lastFocused = document.activeElement;
    dialogTitleEl.textContent = achievement.label;
    dialogDescriptionEl.textContent = achievement.description || 'No description available.';
    dialogStatusEl.textContent = earned ? 'Earned' : 'Not earned yet';
    dialogStatusEl.className = 'achievement-dialog-status' + (earned ? ' is-earned' : '');

    dialogEl.hidden = false;
    document.body.classList.add('achievement-dialog-open');
    dialogEl.querySelector('.achievement-dialog-close').focus();
  }

  function CloseAchievementDialog() {
    if (!dialogEl || dialogEl.hidden) return;

    dialogEl.hidden = true;
    document.body.classList.remove('achievement-dialog-open');

    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    lastFocused = null;
  }

  function CreateAchievementButton(achievement, earned) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'achievement' + (earned ? ' unlocked' : '');
    button.textContent = achievement.label;
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-label',
      `${achievement.label} — ${earned ? 'earned' : 'not earned yet'}. View details.`);
    button.addEventListener('click', () => OpenAchievementDialog(achievement, earned));
    return button;
  }

  window.FormatNumber = FormatNumber;
  window.CreateAchievementButton = CreateAchievementButton;
  window.OpenAchievementDialog = OpenAchievementDialog;
})();
