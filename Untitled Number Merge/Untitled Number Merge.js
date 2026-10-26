const STATS_KEY = 'numberMergeStats';
const COMPLETED_KEY = 'numberMergeCompleted';
const TARGET = 2048;

const VARIANTS = {
  '4x4': { label: '4 × 4', size: 4 },
  '5x5': { label: '5 × 5', size: 5 },
  '6x6': { label: '6 × 6', size: 6 }
};

const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const movesEl = document.getElementById('moves');
const achievementListEl = document.getElementById('achievementList');
const overlayEl = document.getElementById('overlay');
const overlayTitleEl = document.getElementById('overlayTitle');
const overlaySummaryEl = document.getElementById('overlaySummary');
const primaryBtn = document.getElementById('primaryBtn');
const secondaryBtn = document.getElementById('secondaryBtn');
const restartBtn = document.getElementById('restartBtn');
const toastEl = document.getElementById('toast');
const completedBadgeEl = document.getElementById('completedBadge');
const chips = document.querySelectorAll('.chip');

const defaultStats = {
  unlocked: [],
  bestScores: {},
  wins: 0,
  games: 0,
  totalMerges: 0,
  variantsWon: [],
  bestTile: 0
};

function LoadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATS_KEY));
    if (saved) {
      const merged = {
        ...defaultStats,
        ...saved,
        unlocked: saved.unlocked || [],
        bestScores: { ...(saved.bestScores || {}) },
        variantsWon: saved.variantsWon || []
      };

      // Migrate the old single-board best into the 4 × 4 slot.
      if (typeof saved.bestScore === 'number' && !merged.bestScores['4x4']) {
        merged.bestScores['4x4'] = saved.bestScore;
      }
      delete merged.bestScore;

      return merged;
    }
  } catch (e) {
    console.warn('Could not load number merge stats:', e);
  }
  return { ...defaultStats, bestScores: {}, variantsWon: [] };
}

function SaveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn('Could not save number merge stats:', e);
  }
}

const stats = LoadStats();

const achievements = [
  { id: 'firstMerge', label: 'First Merge', description: 'Merge two tiles for the first time.', check: v => v.merges >= 1 },
  { id: 'tile128', label: 'Reach 128', description: 'Create a 128 tile.', check: v => v.maxTile >= 128 },
  { id: 'tile512', label: 'Reach 512', description: 'Create a 512 tile.', check: v => v.maxTile >= 512 },
  { id: 'tile2048', label: 'Reach 2048', description: 'Create a 2048 tile.', check: v => v.maxTile >= 2048 },
  { id: 'tile4096', label: 'Reach 4096', description: 'Create a 4096 tile.', check: v => v.maxTile >= 4096 },
  { id: 'score1000', label: 'Score 1,000', description: 'Reach a score of 1,000 in a single game.', check: v => v.score >= 1000 },
  { id: 'score5000', label: 'Score 5,000', description: 'Reach a score of 5,000 in a single game.', check: v => v.score >= 5000 },
  { id: 'score10000', label: 'Score 10,000', description: 'Reach a score of 10,000 in a single game.', check: v => v.score >= 10000 },
  { id: 'score25000', label: 'Score 25,000', description: 'Reach a score of 25,000 in a single game.', check: v => v.score >= 25000 },
  { id: 'merges50', label: '50 Merges', description: 'Make 50 merges in a single game.', check: v => v.merges >= 50 },
  { id: 'merges200', label: '200 Merges', description: 'Make 200 merges in a single game.', check: v => v.merges >= 200 },
  { id: 'win5x5', label: '5 × 5 Win', description: 'Reach 2048 on the 5 × 5 board.', check: v => v.variantsWon.includes('5x5') },
  { id: 'win6x6', label: '6 × 6 Win', description: 'Reach 2048 on the 6 × 6 board.', check: v => v.variantsWon.includes('6x6') },
  { id: 'big4096', label: '6 × 6 · 4096', description: 'Create a 4096 tile on the 6 × 6 board.', check: v => v.size === 6 && v.maxTile >= 4096 },
  { id: 'explorer', label: 'Explorer', description: 'Win on all three board sizes.', check: v => v.variantsWon.length >= 3 },
  { id: 'games10', label: '10 Games', description: 'Play 10 games.', check: v => v.games >= 10 },
  { id: 'career500', label: '500 Career Merges', description: 'Make 500 merges across all games.', check: v => v.totalMerges >= 500 },
  { id: 'legend', label: 'Legend', description: 'Create an 8192 tile at any point in your career.', check: v => v.bestTile >= 8192 }
];

let variantKey = '4x4';
let variant = VARIANTS[variantKey];
let grid = [];
let cellEls = [];
let score = 0;
let moves = 0;
let merges = 0;
let won = false;
let counted = false;

function EmptyGrid() {
  return Array.from({ length: variant.size }, () => Array(variant.size).fill(0));
}

function Transpose(matrix) {
  return matrix[0].map((_, col) => matrix.map(row => row[col]));
}

function MaxTile() {
  return Math.max(...grid.flat());
}

function AddRandomTile() {
  const empty = [];
  grid.forEach((row, r) => row.forEach((value, c) => {
    if (!value) empty.push([r, c]);
  }));
  if (!empty.length) return;

  const [row, col] = empty[Math.floor(Math.random() * empty.length)];
  grid[row][col] = Math.random() < 0.9 ? 2 : 4;
}

function SlideLine(line) {
  const values = line.filter(Boolean);
  const result = [];
  let gained = 0;
  let merged = 0;

  for (let i = 0; i < values.length; i++) {
    if (i + 1 < values.length && values[i] === values[i + 1]) {
      const value = values[i] * 2;
      result.push(value);
      gained += value;
      merged += 1;
      i += 1;
    } else {
      result.push(values[i]);
    }
  }

  while (result.length < variant.size) result.push(0);
  return { line: result, gained, merged };
}

function Move(direction) {
  if (!overlayEl.hidden) return;

  const before = grid.flat();
  let gained = 0;
  let merged = 0;

  const SlideRows = rows => rows.map(row => {
    const slid = SlideLine(row);
    gained += slid.gained;
    merged += slid.merged;
    return slid.line;
  });

  const Reverse = rows => rows.map(row => [...row].reverse());

  if (direction === 'left') {
    grid = SlideRows(grid);
  } else if (direction === 'right') {
    grid = Reverse(SlideRows(Reverse(grid)));
  } else if (direction === 'up') {
    grid = Transpose(SlideRows(Transpose(grid)));
  } else if (direction === 'down') {
    grid = Transpose(Reverse(SlideRows(Reverse(Transpose(grid)))));
  }

  const moved = grid.flat().some((value, i) => value !== before[i]);
  if (!moved) return;

  if (!counted) {
    stats.games += 1;
    counted = true;
  }

  moves += 1;
  merges += merged;
  score += gained;
  stats.totalMerges += merged;

  if (score > (stats.bestScores[variantKey] || 0)) {
    stats.bestScores[variantKey] = score;
  }

  AddRandomTile();
  stats.bestTile = Math.max(stats.bestTile, MaxTile());
  SaveStats();

  Render(before);
  CheckAchievements();

  if (!won && MaxTile() >= TARGET) {
    won = true;
    stats.wins += 1;
    if (!stats.variantsWon.includes(variantKey)) stats.variantsWon.push(variantKey);
    SaveStats();
    CheckAchievements();
    ShowOverlay(`${variant.label} · 2048!`, `Score ${FormatNumber(score)} - keep going for a higher tile.`,
      'Keep playing', HideOverlay);
  } else if (!CanMove()) {
    ShowOverlay('No moves left',
      `Score ${FormatNumber(score)} · best ${FormatNumber(stats.bestScores[variantKey] || 0)}`,
      'Try again', () => StartGame(variantKey), false);
  }
}

function CanMove() {
  if (grid.flat().includes(0)) return true;

  for (let r = 0; r < variant.size; r++) {
    for (let c = 0; c < variant.size; c++) {
      const value = grid[r][c];
      if (c + 1 < variant.size && grid[r][c + 1] === value) return true;
      if (r + 1 < variant.size && grid[r + 1][c] === value) return true;
    }
  }
  return false;
}

function BuildCells() {
  boardEl.innerHTML = '';
  boardEl.style.setProperty('--size', String(variant.size));
  boardEl.classList.toggle('board--dense', variant.size >= 5);
  boardEl.setAttribute('aria-label',
    `Number merge board, ${variant.label}. Use arrow keys or W A S D to move tiles.`);
  cellEls = [];

  for (let i = 0; i < variant.size * variant.size; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';

    const tile = document.createElement('span');
    tile.className = 'tile';
    cell.appendChild(tile);

    boardEl.appendChild(cell);
    cellEls.push(cell);
  }
}

function Render(previous = []) {
  grid.flat().forEach((value, i) => {
    const tile = cellEls[i].firstElementChild;
    const isNew = value !== previous[i];

    let className = 'tile';
    if (value) {
      className += value <= 2048 ? ` tile-${value}` : ' tile-super';
      if (value >= 1024) className += ' tile-big';
      if (isNew) className += ' pop';
    }

    tile.className = className;
    tile.textContent = value ? FormatNumber(value) : '';
  });

  scoreEl.textContent = FormatNumber(score);
  bestEl.textContent = FormatNumber(stats.bestScores[variantKey] || 0);
  movesEl.textContent = FormatNumber(moves);
}

function CheckAchievements() {
  const view = {
    score,
    merges,
    maxTile: MaxTile(),
    size: variant.size,
    wins: stats.wins,
    games: stats.games,
    totalMerges: stats.totalMerges,
    variantsWon: stats.variantsWon,
    bestTile: stats.bestTile
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

function ShowToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(ShowToast._timer);
  ShowToast._timer = setTimeout(() => toastEl.classList.remove('show'), 2000);
}

function ShowOverlay(title, summary, primaryLabel, primaryAction, withSecondary = true) {
  overlayTitleEl.textContent = title;
  overlaySummaryEl.textContent = summary;
  primaryBtn.textContent = primaryLabel;
  primaryBtn.onclick = primaryAction;
  secondaryBtn.hidden = !withSecondary;
  secondaryBtn.textContent = 'New game';
  overlayEl.hidden = false;
  primaryBtn.focus();
}

function HideOverlay() {
  overlayEl.hidden = true;
}

function StartGame(nextVariant = variantKey) {
  if (!VARIANTS[nextVariant]) nextVariant = '4x4';
  variantKey = nextVariant;
  variant = VARIANTS[variantKey];

  grid = EmptyGrid();
  score = 0;
  moves = 0;
  merges = 0;
  won = false;
  counted = false;

  chips.forEach(chip => {
    chip.classList.toggle('is-active', chip.dataset.variant === variantKey);
  });

  scoreEl.textContent = '0';
  movesEl.textContent = '0';
  bestEl.textContent = FormatNumber(stats.bestScores[variantKey] || 0);

  HideOverlay();
  BuildCells();
  AddRandomTile();
  AddRandomTile();
  Render();
}

const directions = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  a: 'left',
  d: 'right',
  w: 'up',
  s: 'down',
  A: 'left',
  D: 'right',
  W: 'up',
  S: 'down'
};

window.addEventListener('keydown', event => {
  const direction = directions[event.key];
  if (!direction) return;
  event.preventDefault();
  Move(direction);
});

let touchStart = null;

boardEl.addEventListener('touchstart', event => {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });

boardEl.addEventListener('touchend', event => {
  if (!touchStart) return;

  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  touchStart = null;

  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    Move(dx > 0 ? 'right' : 'left');
  } else {
    Move(dy > 0 ? 'down' : 'up');
  }
}, { passive: true });

chips.forEach(chip => {
  chip.addEventListener('click', () => StartGame(chip.dataset.variant));
});

secondaryBtn.addEventListener('click', () => StartGame());
restartBtn.addEventListener('click', () => StartGame());

if (HasCompletedBadge()) completedBadgeEl.hidden = false;

RenderAchievements();
StartGame();
