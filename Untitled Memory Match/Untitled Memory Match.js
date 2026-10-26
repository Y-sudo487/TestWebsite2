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

function LoadStats() {
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

function SaveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn('Could not save memory match stats:', e);
  }
}

const stats = LoadStats();

const achievements = [
  { id: 'firstMatch', label: 'First Match', description: 'Find your first matching pair.', check: v => v.pairs >= 1 },
  { id: 'halfway', label: 'Halfway There', description: 'Match 4 pairs in a single game.', check: v => v.pairs >= 4 },
  { id: 'champion', label: 'Champion', description: 'Win your first game of Memory Match.', check: v => v.wins >= 1 },
  { id: 'perfect', label: 'Perfect Memory', description: 'Win a 4 × 4 game in 12 moves or fewer.', check: v => v.won && v.variant === '4x4' && v.moves <= 12 },
  { id: 'speedy', label: 'Speed Run', description: 'Win any game in 45 seconds or less.', check: v => v.won && v.seconds <= 45 },
  { id: 'flawless', label: 'Flawless', description: 'Win a game without any mismatched pairs.', check: v => v.won && v.moves === v.pairs },
  { id: 'blitz', label: 'Blitz', description: 'Win a 4 × 4 game in 30 seconds or less.', check: v => v.won && v.variant === '4x4' && v.seconds <= 30 },
  { id: 'bigDeck', label: 'Big Deck', description: 'Win a 5 × 4 game.', check: v => v.won && v.variant === '5x4' },
  { id: 'giant', label: 'Giant', description: 'Win a 6 × 6 game.', check: v => v.won && v.variant === '6x6' },
  { id: 'marathon', label: 'Marathon', description: 'Win a 6 × 6 game in 3 minutes or less.', check: v => v.won && v.variant === '6x6' && v.seconds <= 180 },
  { id: 'sharp', label: 'Sharp Eye', description: 'Win a 5 × 4 game in 16 moves or fewer.', check: v => v.won && v.variant === '5x4' && v.moves <= 16 },
  { id: 'regular', label: 'Regular', description: 'Win 5 games.', check: v => v.wins >= 5 },
  { id: 'addict', label: 'Addict', description: 'Win 10 games.', check: v => v.wins >= 10 },
  { id: 'century', label: 'Century', description: 'Make 100 total moves across all games.', check: v => v.totalMoves >= 100 },
  { id: 'explorer', label: 'Explorer', description: 'Win a game in every board size.', check: v => v.variantsWon.length >= 3 }
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

function FormatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function CurrentSeconds() {
  return startTime === null ? 0 : Math.floor((performance.now() - startTime) / 1000);
}

function Shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function BuildBoard() {
  const symbols = SYMBOLS.slice(0, variant.pairs);
  const deck = Shuffle([...symbols, ...symbols]);

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
    card.addEventListener('click', () => FlipCard(card));
    boardEl.appendChild(card);
  });
}

function StartTimer() {
  startTime = performance.now();
  timerId = setInterval(() => {
    elapsed = CurrentSeconds();
    timerEl.textContent = FormatTime(elapsed);
  }, 500);
}

function StopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function FlipCard(card) {
  if (locked || won || card.classList.contains('flipped')) return;

  if (startTime === null) StartTimer();

  card.classList.add('flipped');
  card.setAttribute('aria-label', `Card showing ${card.dataset.symbol}`);

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  moves += 1;
  movesEl.textContent = FormatNumber(moves);

  if (firstCard.dataset.symbol === secondCard.dataset.symbol) {
    const pair = [firstCard, secondCard];
    firstCard = null;
    secondCard = null;

    pair.forEach(matched => {
      matched.classList.add('matched');
      matched.disabled = true;
    });

    matchedPairs += 1;
    pairsEl.textContent = `${FormatNumber(matchedPairs)} / ${FormatNumber(variant.pairs)}`;
    CheckAchievements();

    if (matchedPairs === variant.pairs) FinishGame();
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

function FinishGame() {
  won = true;
  StopTimer();
  elapsed = CurrentSeconds();
  timerEl.textContent = FormatTime(elapsed);

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

  SaveStats();
  RenderBest();
  CheckAchievements();

  winSummaryEl.textContent = `${variant.label} · ${FormatNumber(moves)} moves in ${FormatTime(elapsed)}`;
  winEl.hidden = false;
  playAgainBtn.focus();
}

function CheckAchievements() {
  const view = {
    pairs: matchedPairs,
    moves,
    seconds: won ? elapsed : CurrentSeconds(),
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
      ShowToast(`Achievement unlocked: ${a.label}`);
    }
  });

  if (changed) {
    SaveStats();
    RenderAchievements();
    CheckCompletion();
  }
}

function AllAchievementsUnlocked() {
  return achievements.every(a => stats.unlocked.includes(a.id));
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
  SaveStats();
  ShowToast('All achievements unlocked - 100% complete! Redirecting…');
  setTimeout(() => { window.location.href = '../index.html'; }, 3000);
}

function RenderAchievements() {
  achievementListEl.innerHTML = '';
  achievements.forEach(a => {
    achievementListEl.appendChild(CreateAchievementButton(a, stats.unlocked.includes(a.id)));
  });
}

function RenderBest() {
  const best = stats.best[variantKey];
  bestEl.textContent = best ? `${FormatNumber(best.moves)} moves` : '-';
}

function ShowToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(ShowToast._timer);
  ShowToast._timer = setTimeout(() => toastEl.classList.remove('show'), 2000);
}

function StartGame(nextVariant = variantKey) {
  if (!VARIANTS[nextVariant]) nextVariant = '4x4';


  if (!won && moves > 0) {
    stats.winStreak = 0;
    SaveStats();
  }

  variantKey = nextVariant;
  variant = VARIANTS[variantKey];

  StopTimer();
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
  pairsEl.textContent = `0 / ${FormatNumber(variant.pairs)}`;
  timerEl.textContent = '0:00';
  winEl.hidden = true;

  RenderBest();
  BuildBoard();
}

chips.forEach(chip => {
  chip.addEventListener('click', () => StartGame(chip.dataset.variant));
});

restartBtn.addEventListener('click', () => StartGame());
playAgainBtn.addEventListener('click', () => StartGame());

if (HasCompletedBadge()) completedBadgeEl.hidden = false;

RenderAchievements();
StartGame();
