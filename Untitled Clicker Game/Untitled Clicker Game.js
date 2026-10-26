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

function LoadState() {
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

function SaveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save state:', e);
  }
}

const state = LoadState();

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
  { id: 'firstClick', label: 'First Click', description: 'Earn your first coin by clicking the big button.', check: () => state.totalCoinsEarned > 0 },
  { id: 'hundred', label: '100 Coins', description: 'Earn a total of 100 coins.', check: () => state.totalCoinsEarned >= 100 },
  { id: 'thousand', label: '1K Coins', description: 'Earn a total of 1,000 coins.', check: () => state.totalCoinsEarned >= 1000 },
  { id: 'tenThousand', label: '10K Coins', description: 'Earn a total of 10,000 coins.', check: () => state.totalCoinsEarned >= 10000 },
  { id: 'million', label: '1M Coins', description: 'Earn a total of 1,000,000 coins.', check: () => state.totalCoinsEarned >= 1000000 },
  { id: 'tenMillion', label: '10M Coins', description: 'Earn a total of 10,000,000 coins.', check: () => state.totalCoinsEarned >= 10000000 },
  { id: 'hundredMillion', label: '100M Coins', description: 'Earn a total of 100,000,000 coins.', check: () => state.totalCoinsEarned >= 100000000 },
  { id: 'billion', label: '1B Coins', description: 'Earn a total of 1,000,000,000 coins.', check: () => state.totalCoinsEarned >= 1000000000 },
  { id: 'autoFan', label: 'Auto Fan', description: 'Own 5 Auto Clickers.', check: () => state.autoClick >= 5 },
  { id: 'factoryOwner', label: 'Factory Owner', description: 'Buy your first Factory.', check: () => state.factory >= 1 },
  { id: 'goldenHunter', label: 'Golden Hunter', description: 'Buy the Golden Touch upgrade.', check: () => state.goldenTouch >= 1 },
  { id: 'luckyOne', label: 'Lucky One', description: 'Buy 3 Lucky Charms.', check: () => state.luckyCharm >= 3 },
  { id: 'critMaster', label: 'Crit Master', description: 'Buy 5 Critical Click upgrades.', check: () => state.criticalClick >= 5 },
  { id: 'prestigious', label: 'Prestigious', description: 'Buy your first Prestige Boost.', check: () => state.prestigeBoost >= 1 }
];

function GoldenMultiplier() {
  return Math.pow(2, state.goldenTouch);
}

function PrestigeMultiplier() {
  return 1 + state.prestigeBoost * 0.1;
}

function TotalPerClick() {
  return (state.clickPower + state.megaClick * 5) * GoldenMultiplier() * PrestigeMultiplier();
}

function TotalPerSecond() {
  return (state.autoClick + state.factory * 5) * PrestigeMultiplier();
}

function CheckAchievements() {
  let changed = false;
  achievements.forEach(a => {
    if (!state.achievements.includes(a.id) && a.check()) {
      state.achievements.push(a.id);
      changed = true;
      ShowToast(`Achievement unlocked: ${a.label}`);
    }
  });
  if (changed) {
    SaveState();
    CheckCompletion();
  }
}

function AllAchievementsUnlocked() {
  return achievements.every(a => state.achievements.includes(a.id));
}

function HasCompletedBadge() {
  try {
    return localStorage.getItem(COMPLETED_KEY) === '1';
  } catch (e) {
    return false;
  }
}

function CheckCompletion() {
  if (HasCompletedBadge() || !AllAchievementsUnlocked()) return;

  try {
    localStorage.setItem(COMPLETED_KEY, '1');
  } catch (e) {
    console.warn('Could not save completion:', e);
  }

  completedBadgeEl.hidden = false;
  SaveState();
  ShowToast('All achievements unlocked - 100% complete! Redirecting…');
  setTimeout(() => { window.location.href = '../index.html'; }, 3000);
}

function RenderAchievements() {
  achievementListEl.innerHTML = '';
  achievements.forEach(a => {
    achievementListEl.appendChild(CreateAchievementButton(a, state.achievements.includes(a.id)));
  });
}

function Render() {
  counterEl.textContent = FormatNumber(Math.floor(state.coins));

  statsEl.innerHTML = `
    Per click: ${FormatNumber(Math.floor(TotalPerClick()))} &nbsp;|&nbsp; Per second: ${FormatNumber(Math.floor(TotalPerSecond()))}<br>
    Golden Touch: x${FormatNumber(GoldenMultiplier())} &nbsp;|&nbsp; Prestige: x${FormatNumber(PrestigeMultiplier(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<br>
    Crit chance: ${FormatNumber(state.criticalClick * 5)}%
  `;

  buyButtons.forEach(btn => {
    const type = btn.dataset.type;
    const cost = costs[type]();
    btn.textContent = `Buy (${FormatNumber(cost)})`;
    btn.disabled = state.coins < cost;
  });

  RenderAchievements();
}

function AddCoins(amount) {
  state.coins += amount;
  state.totalCoinsEarned += amount;
  CheckAchievements();
  SaveState();
  Render();
}

function ShowToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(ShowToast._timer);
  ShowToast._timer = setTimeout(() => toastEl.classList.remove('show'), 2000);
}

function WipeProgress() {
  Object.assign(state, { ...defaultState, achievements: [] });
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COMPLETED_KEY);
  } catch (e) {
    console.warn('Could not clear saved progress:', e);
  }
  if (completedBadgeEl) completedBadgeEl.hidden = true;
  Render();
}

clickBtn.addEventListener('click', () => {
  let amount = TotalPerClick();
  const critChance = state.criticalClick * 0.05;
  const isCrit = Math.random() < critChance;

  if (isCrit) {
    amount *= 10;
    counterEl.classList.add('crit');
    setTimeout(() => counterEl.classList.remove('crit'), 300);
    ShowToast(`Critical! x10 (+${FormatNumber(Math.floor(amount))})`);
  }

  AddCoins(amount);
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
    CheckAchievements();
    SaveState();
    Render();
  });
});

resetBtn.addEventListener('click', () => {
  if (!confirm('Reset all progress?')) return;
  WipeProgress();
  SaveState();
});

setInterval(() => {
  const income = TotalPerSecond();
  if (income > 0) {
    state.coins += income;
    state.totalCoinsEarned += income;
    CheckAchievements();
    SaveState();
    Render();
  }
}, 1000);

function ScheduleGoldenCoin() {
  const baseMin = 30000;
  const baseMax = 60000;
  const reduction = Math.min(state.luckyCharm * 5000, 20000);
  const min = Math.max(baseMin - reduction, 10000);
  const max = Math.max(baseMax - reduction, 20000);
  const delay = min + Math.random() * (max - min);

  setTimeout(() => {
    SpawnGoldenCoin();
  }, delay);
}

function SpawnGoldenCoin() {
  const x = 10 + Math.random() * 80;
  const y = 10 + Math.random() * 80;
  goldenCoinEl.style.left = `${x}vw`;
  goldenCoinEl.style.top = `${y}vh`;
  goldenCoinEl.classList.add('visible');

  const lifetime = 8000;
  const hideTimer = setTimeout(() => {
    goldenCoinEl.classList.remove('visible');
    ScheduleGoldenCoin();
  }, lifetime);

  goldenCoinEl.onclick = () => {
    clearTimeout(hideTimer);
    goldenCoinEl.classList.remove('visible');

    const reward = Math.max(10, Math.floor(TotalPerClick() * 20));
    AddCoins(reward);
    ShowToast(`Golden coin! +${FormatNumber(reward)} coins`);

    ScheduleGoldenCoin();
  };
}

ScheduleGoldenCoin();

Render();

if (HasCompletedBadge()) completedBadgeEl.hidden = false;
CheckCompletion();