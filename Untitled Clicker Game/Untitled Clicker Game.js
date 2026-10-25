const STORAGE_KEY = 'clickerGameState';
const COMPLETED_KEY = 'clickerGameCompleted';

const defaultState = {
  coins: 0,
  totalCoinsEarned: 0,
  clickPower: 1,
  autoClick: 0,
  megaClick: 0,
  goldenTouch: 0,
  luckyCharm: 0,
  factory: 0,
  criticalClick: 0,
  prestigeBoost: 0,
  achievements: []
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultState, ...parsed, achievements: parsed.achievements || [] };
    }
  } catch (e) {
    console.warn('Could not load saved state:', e);
  }
  return { ...defaultState };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save state:', e);
  }
}

const state = loadState();

const counterEl = document.getElementById('counter');
const statsEl = document.getElementById('stats');
const clickBtn = document.getElementById('clickBtn');
const buyButtons = document.querySelectorAll('.buy-btn');
const resetBtn = document.getElementById('resetBtn');
const goldenCoinEl = document.getElementById('goldenCoin');
const toastEl = document.getElementById('toast');
const achievementListEl = document.getElementById('achievementList');
const completedBadgeEl = document.getElementById('completedBadge');

const costs = {
  clickPower: () => 10 * Math.pow(2, state.clickPower - 1),
  autoClick: () => 50 * Math.pow(2, state.autoClick),
  megaClick: () => 200 * Math.pow(3, state.megaClick),
  goldenTouch: () => 500 * Math.pow(5, state.goldenTouch),
  luckyCharm: () => 1000 * Math.pow(4, state.luckyCharm),
  factory: () => 2000 * Math.pow(3, state.factory),
  criticalClick: () => 3000 * Math.pow(4, state.criticalClick),
  prestigeBoost: () => 10000 * Math.pow(6, state.prestigeBoost)
};

const achievements = [
  { id: 'firstClick', label: 'First Click', check: () => state.totalCoinsEarned > 0 },
  { id: 'hundred', label: '100 Coins', check: () => state.totalCoinsEarned >= 100 },
  { id: 'thousand', label: '1K Coins', check: () => state.totalCoinsEarned >= 1000 },
  { id: 'tenThousand', label: '10K Coins', check: () => state.totalCoinsEarned >= 10000 },
  { id: 'million', label: '1M Coins', check: () => state.totalCoinsEarned >= 1000000 },
  { id: 'tenMillion', label: '10M Coins', check: () => state.totalCoinsEarned >= 10000000 },
  { id: 'hundredMillion', label: '100M Coins', check: () => state.totalCoinsEarned >= 100000000 },
  { id: 'billion', label: '1B Coins', check: () => state.totalCoinsEarned >= 1000000000 },
  { id: 'autoFan', label: 'Auto Fan', check: () => state.autoClick >= 5 },
  { id: 'factoryOwner', label: 'Factory Owner', check: () => state.factory >= 1 },
  { id: 'goldenHunter', label: 'Golden Hunter', check: () => state.goldenTouch >= 1 },
  { id: 'luckyOne', label: 'Lucky One', check: () => state.luckyCharm >= 3 },
  { id: 'critMaster', label: 'Crit Master', check: () => state.criticalClick >= 5 },
  { id: 'prestigious', label: 'Prestigious', check: () => state.prestigeBoost >= 1 }
];

function goldenMultiplier() {
  return Math.pow(2, state.goldenTouch);
}

function prestigeMultiplier() {
  return 1 + state.prestigeBoost * 0.1;
}

function totalPerClick() {
  return (state.clickPower + state.megaClick * 5) * goldenMultiplier() * prestigeMultiplier();
}

function totalPerSecond() {
  return (state.autoClick + state.factory * 5) * prestigeMultiplier();
}

function checkAchievements() {
  let changed = false;
  achievements.forEach(a => {
    if (!state.achievements.includes(a.id) && a.check()) {
      state.achievements.push(a.id);
      changed = true;
      showToast(`Achievement unlocked: ${a.label}`);
    }
  });
  if (changed) {
    saveState();
    checkCompletion();
  }
}

function allAchievementsUnlocked() {
  return achievements.every(a => state.achievements.includes(a.id));
}

function hasCompletedBadge() {
  try {
    return localStorage.getItem(COMPLETED_KEY) === '1';
  } catch (e) {
    return false;
  }
}

function checkCompletion() {
  if (hasCompletedBadge() || !allAchievementsUnlocked()) return;

  try {
    localStorage.setItem(COMPLETED_KEY, '1');
  } catch (e) {
    console.warn('Could not save completion:', e);
  }

  completedBadgeEl.hidden = false;
  saveState();
  showToast('All achievements unlocked — 100% complete! Redirecting…');
  setTimeout(() => { window.location.href = '../index.html'; }, 3000);
}

function renderAchievements() {
  achievementListEl.innerHTML = '';
  achievements.forEach(a => {
    const el = document.createElement('span');
    el.className = 'achievement' + (state.achievements.includes(a.id) ? ' unlocked' : '');
    el.textContent = a.label;
    achievementListEl.appendChild(el);
  });
}

function render() {
  counterEl.textContent = Math.floor(state.coins);

  statsEl.innerHTML = `
    Per click: ${Math.floor(totalPerClick())} &nbsp;|&nbsp; Per second: ${Math.floor(totalPerSecond())}<br>
    Golden Touch: x${goldenMultiplier()} &nbsp;|&nbsp; Prestige: x${prestigeMultiplier().toFixed(1)}<br>
    Crit chance: ${state.criticalClick * 5}%
  `;

  buyButtons.forEach(btn => {
    const type = btn.dataset.type;
    const cost = costs[type]();
    btn.textContent = `Buy (${cost})`;
    btn.disabled = state.coins < cost;
  });

  renderAchievements();
}

function addCoins(amount) {
  state.coins += amount;
  state.totalCoinsEarned += amount;
  checkAchievements();
  saveState();
  render();
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toastEl.classList.remove('show'), 2000);
}

function wipeProgress() {
  Object.assign(state, { ...defaultState, achievements: [] });
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COMPLETED_KEY);
  } catch (e) {
    console.warn('Could not clear saved progress:', e);
  }
  if (completedBadgeEl) completedBadgeEl.hidden = true;
  render();
}

clickBtn.addEventListener('click', () => {
  let amount = totalPerClick();
  const critChance = state.criticalClick * 0.05;
  const isCrit = Math.random() < critChance;

  if (isCrit) {
    amount *= 10;
    counterEl.classList.add('crit');
    setTimeout(() => counterEl.classList.remove('crit'), 300);
    showToast(`Critical! x10 (+${Math.floor(amount)})`);
  }

  addCoins(amount);
  counterEl.classList.add('bump');
  setTimeout(() => counterEl.classList.remove('bump'), 100);
});

buyButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;
    const cost = costs[type]();
    if (state.coins < cost) return;
    state.coins -= cost;
    state[type] += 1;
    checkAchievements();
    saveState();
    render();
  });
});

resetBtn.addEventListener('click', () => {
  if (!confirm('Reset all progress?')) return;
  wipeProgress();
  saveState();
});

setInterval(() => {
  const income = totalPerSecond();
  if (income > 0) {
    state.coins += income;
    state.totalCoinsEarned += income;
    checkAchievements();
    saveState();
    render();
  }
}, 1000);

function scheduleGoldenCoin() {
  const baseMin = 30000;
  const baseMax = 60000;
  const reduction = Math.min(state.luckyCharm * 5000, 20000);
  const min = Math.max(baseMin - reduction, 10000);
  const max = Math.max(baseMax - reduction, 20000);
  const delay = min + Math.random() * (max - min);

  setTimeout(() => {
    spawnGoldenCoin();
  }, delay);
}

function spawnGoldenCoin() {
  const x = 10 + Math.random() * 80;
  const y = 10 + Math.random() * 80;
  goldenCoinEl.style.left = `${x}vw`;
  goldenCoinEl.style.top = `${y}vh`;
  goldenCoinEl.classList.add('visible');

  const lifetime = 8000;
  const hideTimer = setTimeout(() => {
    goldenCoinEl.classList.remove('visible');
    scheduleGoldenCoin();
  }, lifetime);

  goldenCoinEl.onclick = () => {
    clearTimeout(hideTimer);
    goldenCoinEl.classList.remove('visible');

    const reward = Math.max(10, Math.floor(totalPerClick() * 20));
    addCoins(reward);
    showToast(`Golden coin! +${reward} coins`);

    scheduleGoldenCoin();
  };
}

scheduleGoldenCoin();

render();

if (hasCompletedBadge()) completedBadgeEl.hidden = false;
checkCompletion();