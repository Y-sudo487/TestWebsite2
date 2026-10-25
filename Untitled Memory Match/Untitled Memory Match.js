const STATS_KEY = 'memoryMatchStats';
const COMPLETED_KEY = 'memoryMatchCompleted';

const VARIANTS = {
  '4x4': { label: '4 × 4', pairs: 8, cols: 4 },
  '5x4': { label: '5 × 4', pairs: 10, cols: 5 },
  '6x6': { label: '6 × 6', pairs: 18, cols: 6 }
};

const SYMBOLS = [
  '🍊', '🍋', '🔥', '🌶️', '⭐', '🍑', '🍒', '🥇', '🍇',
  '🍉', '🌙', '⚡', '🍀', '💎', '🎲', '🧠', '🚀', '🎯'
];

const boardEl = document.getElementById('board');
const movesEl = document.getElementById('moves');
const pairsEl = document.getElementById('pairs');
const timerEl = document.getElementById('timer');
const bestEl = document.getElementById('best');
const achievementListEl = document.getElementById('achievementList');
const winEl = document.getElementById('win');
const winSummaryEl = document.getElementById('winSummary');
const restartBtn = document.getElementById('restartBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const toastEl = document.getElementById('toast');
const completedBadgeEl = document.getElementById('completedBadge');
const chips = document.querySelectorAll('.chip');

const defaultStats = {
  unlocked: [],
  best: {},
  wins: 0,
  totalMoves: 0,
  winStreak: 0,
  bestWinStreak: 0,
  variantsWon: []
};

function loadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATS_KEY));
    if (saved) {
      const merged = {
        ...defaultStats,
        ...saved,
        unlocked: saved.unlocked || [],
        best: { ...(saved.best || {}) },
        variantsWon: saved.variantsWon || []
      };

      // Migrate the old single-board best into the 4 × 4 slot.
      if (saved.bestMoves != null && !merged.best['4x4']) {
        merged.best['4x4'] = { moves: saved.bestMoves, seconds: saved.bestSeconds };
      }
      delete merged.bestMoves;
      delete merged.bestSeconds;

      return merged;
    }
  } catch (e) {
    console.warn('Could not load memory match stats:', e);
  }
  return { ...defaultStats, best: {}, variantsWon: [] };
}

function saveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn('Could not save memory match stats:', e);
  }
}

const stats = loadStats();

const achievements = [
  { id: 'firstMatch', label: 'First Match', check: v => v.pairs >= 1 },
  { id: 'halfway', label: 'Halfway There', check: v => v.pairs >= 4 },
  { id: 'champion', label: 'Champion', check: v => v.wins >= 1 },
  { id: 'perfect', label: 'Perfect Memory', check: v => v.won && v.variant === '4x4' && v.moves <= 12 },
  { id: 'speedy', label: 'Speed Run', check: v => v.won && v.seconds <= 45 },
  { id: 'flawless', label: 'Flawless', check: v => v.won && v.moves === v.pairs },
  { id: 'blitz', label: 'Blitz', check: v => v.won && v.variant === '4x4' && v.seconds <= 30 },
  { id: 'bigDeck', label: 'Big Deck', check: v => v.won && v.variant === '5x4' },
  { id: 'giant', label: 'Giant', check: v => v.won && v.variant === '6x6' },
  { id: 'marathon', label: 'Marathon', check: v => v.won && v.variant === '6x6' && v.seconds <= 180 },
  { id: 'sharp', label: 'Sharp Eye', check: v => v.won && v.variant === '5x4' && v.moves <= 16 },
  { id: 'regular', label: 'Regular', check: v => v.wins >= 5 },
  { id: 'addict', label: 'Addict', check: v => v.wins >= 10 },
  { id: 'century', label: 'Century', check: v => v.totalMoves >= 100 },
  { id: 'streak3', label: 'Hot Streak', check: v => v.bestWinStreak >= 3 },
  { id: 'explorer', label: 'Explorer', check: v => v.variantsWon.length >= 3 }
];

let variantKey = '4x4';
let variant = VARIANTS[variantKey];
let firstCard = null;
let secondCard = null;
let locked = false;
let moves = 0;
let matchedPairs = 0;
let won = false;
let startTime = null;
let elapsed = 0;
let timerId = null;

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function currentSeconds() {
  return startTime === null ? 0 : Math.floor((performance.now() - startTime) / 1000);
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function buildBoard() {
  const symbols = SYMBOLS.slice(0, variant.pairs);
  const deck = shuffle([...symbols, ...symbols]);

  boardEl.innerHTML = '';
  boardEl.classList.toggle('board--dense', variant.cols >= 6);
  boardEl.style.setProperty('--cols', String(variant.cols));
  boardEl.setAttribute('aria-label', `Memory match board, ${variant.label}`);

  deck.forEach(symbol => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'mcard';
    card.dataset.symbol = symbol;
    card.setAttribute('aria-label', 'Hidden card');
    card.innerHTML = `
      <span class="mcard-inner">
        <span class="face face-back" aria-hidden="true">?</span>
        <span class="face face-front" aria-hidden="true">${symbol}</span>
      </span>`;
    card.addEventListener('click', () => flipCard(card));
    boardEl.appendChild(card);
  });
}

function startTimer() {
  startTime = performance.now();
  timerId = setInterval(() => {
    elapsed = currentSeconds();
    timerEl.textContent = formatTime(elapsed);
  }, 500);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function flipCard(card) {
  if (locked || won || card.classList.contains('flipped')) return;

  if (startTime === null) startTimer();

  card.classList.add('flipped');
  card.setAttribute('aria-label', `Card showing ${card.dataset.symbol}`);

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  moves += 1;
  movesEl.textContent = moves;

  if (firstCard.dataset.symbol === secondCard.dataset.symbol) {
    const pair = [firstCard, secondCard];
    firstCard = null;
    secondCard = null;

    pair.forEach(matched => {
      matched.classList.add('matched');
      matched.disabled = true;
    });

    matchedPairs += 1;
    pairsEl.textContent = `${matchedPairs} / ${variant.pairs}`;
    checkAchievements();

    if (matchedPairs === variant.pairs) finishGame();
  } else {
    const pair = [firstCard, secondCard];
    firstCard = null;
    secondCard = null;
    locked = true;

    setTimeout(() => {
      pair.forEach(missed => {
        missed.classList.remove('flipped');
        missed.setAttribute('aria-label', 'Hidden card');
      });
      locked = false;
    }, 750);
  }
}

function finishGame() {
  won = true;
  stopTimer();
  elapsed = currentSeconds();
  timerEl.textContent = formatTime(elapsed);

  stats.wins += 1;
  stats.totalMoves += moves;
  stats.winStreak += 1;
  stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.winStreak);
  if (!stats.variantsWon.includes(variantKey)) stats.variantsWon.push(variantKey);

  const best = stats.best[variantKey];
  if (!best ||
      moves < best.moves ||
      (moves === best.moves && elapsed < best.seconds)) {
    stats.best[variantKey] = { moves, seconds: elapsed };
  }

  saveStats();
  renderBest();
  checkAchievements();

  winSummaryEl.textContent = `${variant.label} · ${moves} moves in ${formatTime(elapsed)}`;
  winEl.hidden = false;
  playAgainBtn.focus();
}

function checkAchievements() {
  const view = {
    pairs: matchedPairs,
    moves,
    seconds: won ? elapsed : currentSeconds(),
    won,
    variant: variantKey,
    wins: stats.wins,
    totalMoves: stats.totalMoves,
    bestWinStreak: stats.bestWinStreak,
    variantsWon: stats.variantsWon
  };

  let changed = false;
  achievements.forEach(a => {
    if (!stats.unlocked.includes(a.id) && a.check(view)) {
      stats.unlocked.push(a.id);
      changed = true;
      showToast(`Achievement unlocked: ${a.label}`);
    }
  });

  if (changed) {
    saveStats();
    renderAchievements();
    checkCompletion();
  }
}

function allAchievementsUnlocked() {
  return achievements.every(a => stats.unlocked.includes(a.id));
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
  saveStats();
  showToast('All achievements unlocked — 100% complete! Redirecting…');
  setTimeout(() => { window.location.href = '../index.html'; }, 3000);
}

function renderAchievements() {
  achievementListEl.innerHTML = '';
  achievements.forEach(a => {
    const el = document.createElement('span');
    el.className = 'achievement' + (stats.unlocked.includes(a.id) ? ' unlocked' : '');
    el.textContent = a.label;
    achievementListEl.appendChild(el);
  });
}

function renderBest() {
  const best = stats.best[variantKey];
  bestEl.textContent = best ? `${best.moves} moves` : '—';
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toastEl.classList.remove('show'), 2000);
}

function startGame(nextVariant = variantKey) {
  if (!VARIANTS[nextVariant]) nextVariant = '4x4';

  // Walking away from a game that was already underway breaks the win streak.
  if (!won && moves > 0) {
    stats.winStreak = 0;
    saveStats();
  }

  variantKey = nextVariant;
  variant = VARIANTS[variantKey];

  stopTimer();
  firstCard = null;
  secondCard = null;
  locked = false;
  won = false;
  moves = 0;
  matchedPairs = 0;
  startTime = null;
  elapsed = 0;

  chips.forEach(chip => {
    chip.classList.toggle('is-active', chip.dataset.variant === variantKey);
  });

  movesEl.textContent = '0';
  pairsEl.textContent = `0 / ${variant.pairs}`;
  timerEl.textContent = '0:00';
  winEl.hidden = true;

  renderBest();
  buildBoard();
}

chips.forEach(chip => {
  chip.addEventListener('click', () => startGame(chip.dataset.variant));
});

restartBtn.addEventListener('click', () => startGame());
playAgainBtn.addEventListener('click', () => startGame());

if (hasCompletedBadge()) completedBadgeEl.hidden = false;

renderAchievements();
startGame();
