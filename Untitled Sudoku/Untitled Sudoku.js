const STATS_KEY = 'untitledSudokuStats';
const COMPLETED_KEY = 'untitledSudokuCompleted';

const VARIANTS = {
  mini4: { label: 'Mini 4 × 4', size: 4, boxRows: 2, boxCols: 2, givens: 8 },
  mini6: { label: 'Mini 6 × 6', size: 6, boxRows: 2, boxCols: 3, givens: 18 },
  easy: { label: 'Easy', size: 9, boxRows: 3, boxCols: 3, givens: 45 },
  medium: { label: 'Medium', size: 9, boxRows: 3, boxCols: 3, givens: 36 },
  hard: { label: 'Hard', size: 9, boxRows: 3, boxCols: 3, givens: 30 },
  expert: { label: 'Expert', size: 9, boxRows: 3, boxCols: 3, givens: 27 }
};

const CLASSIC_LEVELS = ['easy', 'medium', 'hard', 'expert'];

const boardEl = document.getElementById('board');
const difficultyEl = document.getElementById('difficulty');
const timerEl = document.getElementById('timer');
const mistakesEl = document.getElementById('mistakes');
const padEl = document.getElementById('pad');
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
  wins: 0,
  variantsWon: [],
  winStreak: 0,
  bestWinStreak: 0
};

function loadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATS_KEY));
    if (saved) {
      return {
        ...defaultStats,
        ...saved,
        unlocked: saved.unlocked || [],
        variantsWon: saved.variantsWon || []
      };
    }
  } catch (e) {
    console.warn('Could not load sudoku stats:', e);
  }
  return { ...defaultStats, variantsWon: [] };
}

function saveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn('Could not save sudoku stats:', e);
  }
}

const stats = loadStats();

const achievements = [
  { id: 'firstFill', label: 'First Fill', check: v => v.fills >= 1 },
  { id: 'mini4Win', label: 'Mini 4 × 4', check: v => v.variantsWon.includes('mini4') },
  { id: 'mini6Win', label: 'Mini 6 × 6', check: v => v.variantsWon.includes('mini6') },
  { id: 'easyWin', label: 'Easy Win', check: v => v.variantsWon.includes('easy') },
  { id: 'mediumWin', label: 'Medium Win', check: v => v.variantsWon.includes('medium') },
  { id: 'hardWin', label: 'Hard Win', check: v => v.variantsWon.includes('hard') },
  { id: 'expertWin', label: 'Expert Win', check: v => v.variantsWon.includes('expert') },
  { id: 'flawless', label: 'Flawless', check: v => v.solved && v.size === 9 && v.mistakes === 0 },
  { id: 'miniFlawless', label: 'Mini Flawless', check: v => v.solved && v.size === 4 && v.mistakes === 0 },
  { id: 'smallFlawless', label: 'Small Flawless', check: v => v.solved && v.size === 6 && v.mistakes === 0 },
  { id: 'speedy', label: 'Under 5:00', check: v => v.solved && v.size === 9 && v.seconds <= 300 },
  { id: 'sub2', label: 'Under 2:00', check: v => v.solved && v.size === 9 && v.seconds <= 120 },
  { id: 'threeWins', label: 'Three Wins', check: v => v.wins >= 3 },
  { id: 'tenWins', label: 'Ten Wins', check: v => v.wins >= 10 },
  { id: 'streak3', label: 'Hot Streak', check: v => v.bestWinStreak >= 3 },
  { id: 'allSizes', label: 'All Sizes', check: v => ['mini4', 'mini6'].every(k => v.variantsWon.includes(k)) &&
      CLASSIC_LEVELS.some(k => v.variantsWon.includes(k)) },
  { id: 'allNine', label: 'All Difficulties', check: v => CLASSIC_LEVELS.every(k => v.variantsWon.includes(k)) }
];

let solution = [];
let puzzle = [];
let grid = [];
let cellEls = [];
let level = 'easy';
let spec = VARIANTS[level];
let selected = null;
let mistakes = 0;
let fills = 0;
let seconds = 0;
let solved = false;
let timerId = null;

/* ---------- Generator ---------- */

function shuffled(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function fits(board, index, value, config) {
  const size = config.size;
  const row = Math.floor(index / size);
  const col = index % size;

  for (let i = 0; i < size; i++) {
    if (board[row * size + i] === value) return false;
    if (board[i * size + col] === value) return false;
  }

  const boxRow = row - row % config.boxRows;
  const boxCol = col - col % config.boxCols;
  for (let r = boxRow; r < boxRow + config.boxRows; r++) {
    for (let c = boxCol; c < boxCol + config.boxCols; c++) {
      if (board[r * size + c] === value) return false;
    }
  }

  return true;
}

function fillGrid(board, config) {
  const index = board.indexOf(0);
  if (index === -1) return true;

  const values = [];
  for (let value = 1; value <= config.size; value++) values.push(value);

  for (const value of shuffled(values)) {
    if (!fits(board, index, value, config)) continue;
    board[index] = value;
    if (fillGrid(board, config)) return true;
    board[index] = 0;
  }

  return false;
}

function candidates(board, index, config) {
  const list = [];
  for (let value = 1; value <= config.size; value++) {
    if (fits(board, index, value, config)) list.push(value);
  }
  return list;
}

function countSolutions(board, limit, config) {
  let count = 0;

  function search() {
    let best = -1;
    let options = null;

    for (let i = 0; i < board.length; i++) {
      if (board[i]) continue;
      const list = candidates(board, i, config);
      if (!list.length) return;
      if (!options || list.length < options.length) {
        best = i;
        options = list;
        if (list.length === 1) break;
      }
    }

    if (best === -1) {
      count += 1;
      return;
    }

    for (const value of options) {
      board[best] = value;
      search();
      board[best] = 0;
      if (count >= limit) return;
    }
  }

  search();
  return count;
}

function makePuzzle(config) {
  const total = config.size * config.size;
  const solvedBoard = Array(total).fill(0);
  fillGrid(solvedBoard, config);

  const board = [...solvedBoard];
  let remaining = total;

  for (const index of shuffled([...board.keys()])) {
    if (remaining <= config.givens) break;

    const backup = board[index];
    board[index] = 0;
    if (countSolutions([...board], 2, config) === 1) {
      remaining -= 1;
    } else {
      board[index] = backup;
    }
  }

  return { puzzle: board, solution: solvedBoard };
}

/* ---------- Game state ---------- */

function hasConflict(index) {
  const size = spec.size;
  const value = grid[index];
  if (!value) return false;

  const row = Math.floor(index / size);
  const col = index % size;

  for (let i = 0; i < size; i++) {
    if (i !== col && grid[row * size + i] === value) return true;
    if (i !== row && grid[i * size + col] === value) return true;
  }

  const boxRow = row - row % spec.boxRows;
  const boxCol = col - col % spec.boxCols;
  for (let r = boxRow; r < boxRow + spec.boxRows; r++) {
    for (let c = boxCol; c < boxCol + spec.boxCols; c++) {
      const other = r * size + c;
      if (other !== index && grid[other] === value) return true;
    }
  }

  return false;
}

function buildBoard(size) {
  boardEl.innerHTML = '';
  boardEl.style.setProperty('--size', String(size));
  boardEl.classList.toggle('board--mini', size <= 6);
  boardEl.setAttribute('aria-label',
    `Sudoku ${size} by ${size} board. Select a cell, then type or tap a number.`);
  cellEls = [];

  for (let i = 0; i < size * size; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    cell.setAttribute('aria-label',
      `Row ${Math.floor(i / size) + 1} column ${i % size + 1}`);
    cell.addEventListener('click', () => {
      selected = i;
      render();
    });
    boardEl.appendChild(cell);
    cellEls.push(cell);
  }
}

function buildPad(size) {
  padEl.innerHTML = '';
  padEl.style.setProperty('--pad-cols', String(size === 9 ? 5 : size + 1));

  for (let value = 1; value <= size; value++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pad-btn';
    btn.textContent = value;
    btn.addEventListener('click', () => place(value));
    padEl.appendChild(btn);
  }

  const erase = document.createElement('button');
  erase.type = 'button';
  erase.className = 'pad-btn pad-erase';
  erase.textContent = 'Erase';
  erase.addEventListener('click', () => place(0));
  padEl.appendChild(erase);
}

function render() {
  const size = spec.size;
  const selectedValue = selected === null ? 0 : grid[selected];

  for (let i = 0; i < size * size; i++) {
    const cell = cellEls[i];
    const value = grid[i];
    const row = Math.floor(i / size);
    const col = i % size;

    let className = 'cell';
    if (col % spec.boxCols === spec.boxCols - 1 && col !== size - 1) className += ' box-right';
    if (row % spec.boxRows === spec.boxRows - 1 && row !== size - 1) className += ' box-bottom';
    if (col === size - 1) className += ' last-col';
    if (row === size - 1) className += ' last-row';
    if (puzzle[i]) className += ' given';

    if (selected !== null) {
      const selRow = Math.floor(selected / size);
      const selCol = selected % size;
      const sameBox = Math.floor(row / spec.boxRows) === Math.floor(selRow / spec.boxRows) &&
                      Math.floor(col / spec.boxCols) === Math.floor(selCol / spec.boxCols);

      if (row === selRow || col === selCol || sameBox) className += ' peer';
      if (value && i !== selected && value === selectedValue) className += ' same';
    }

    if (i === selected) className += ' selected';
    if (value && hasConflict(i)) className += ' conflict';

    cell.className = className;
    cell.textContent = value || '';
  }
}

function formatTime(total) {
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function startTimer() {
  if (timerId) return;
  timerId = setInterval(() => {
    seconds += 1;
    timerEl.textContent = formatTime(seconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function place(value) {
  if (selected === null || !overlayEl.hidden || solved) return;
  if (selected >= grid.length) return;

  const index = selected;
  if (puzzle[index]) return;

  if (!value) {
    grid[index] = 0;
    render();
    return;
  }

  startTimer();
  grid[index] = value;

  if (value !== solution[index]) {
    mistakes += 1;
    mistakesEl.textContent = mistakes;
    showToast('Not the right number.');
    render();
    return;
  }

  fills += 1;
  render();
  checkAchievements();

  if (grid.every((v, i) => v === solution[i])) finishGame();
}

function finishGame() {
  solved = true;
  stopTimer();

  stats.wins += 1;
  stats.winStreak += 1;
  stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.winStreak);
  if (!stats.variantsWon.includes(level)) stats.variantsWon.push(level);
  saveStats();

  checkAchievements();
  showOverlay(
    'Solved!',
    `${spec.label} · ${formatTime(seconds)} · ${mistakes} mistake${mistakes === 1 ? '' : 's'}`,
    'Play again',
    () => startGame(level)
  );
}

function checkAchievements() {
  const view = {
    fills,
    solved,
    mistakes,
    seconds,
    level,
    size: spec.size,
    wins: stats.wins,
    variantsWon: stats.variantsWon,
    bestWinStreak: stats.bestWinStreak
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

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toastEl.classList.remove('show'), 2000);
}

function showOverlay(title, summary, primaryLabel, primaryAction) {
  overlayTitleEl.textContent = title;
  overlaySummaryEl.textContent = summary;
  primaryBtn.textContent = primaryLabel;
  primaryBtn.onclick = primaryAction;
  secondaryBtn.textContent = 'All games';
  secondaryBtn.hidden = false;
  overlayEl.hidden = false;
  primaryBtn.focus();
}

function hideOverlay() {
  overlayEl.hidden = true;
}

function startGame(nextLevel = level) {
  if (!VARIANTS[nextLevel]) nextLevel = 'easy';

  // Abandoning a board that already had entries breaks the win streak.
  if (!solved && grid.length && grid.some((v, i) => v && !puzzle[i])) {
    stats.winStreak = 0;
    saveStats();
  }

  level = nextLevel;
  spec = VARIANTS[level];

  const generated = makePuzzle(spec);
  puzzle = generated.puzzle;
  solution = generated.solution;
  grid = [...puzzle];

  selected = null;
  mistakes = 0;
  fills = 0;
  seconds = 0;
  solved = false;

  stopTimer();
  timerEl.textContent = formatTime(0);
  mistakesEl.textContent = '0';
  difficultyEl.textContent = spec.label;

  chips.forEach(chip => {
    chip.classList.toggle('is-active', chip.dataset.level === level);
  });

  buildBoard(spec.size);
  buildPad(spec.size);
  hideOverlay();
  render();
}

const moves = {
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0]
};

window.addEventListener('keydown', event => {
  const key = event.key;
  const digit = Number(key);

  if (key.length === 1 && digit >= 1 && digit <= spec.size) {
    event.preventDefault();
    place(digit);
    return;
  }
  
  if (key === 'Backspace' || key === 'Delete' || key === '0') {
    event.preventDefault();
    place(0);
    return;
  }

  const shift = moves[key];
  if (!shift) return;

  event.preventDefault();
  if (selected === null) {
    selected = 0;
    render();
    return;
  }

  const size = spec.size;
  const row = Math.max(0, Math.min(size - 1, Math.floor(selected / size) + shift[0]));
  const col = Math.max(0, Math.min(size - 1, selected % size + shift[1]));
  selected = row * size + col;
  render();
});

chips.forEach(chip => {
  chip.addEventListener('click', () => startGame(chip.dataset.level));
});

secondaryBtn.addEventListener('click', () => {
  window.location.href = '../index.html';
});
restartBtn.addEventListener('click', () => startGame(level));

if (hasCompletedBadge()) completedBadgeEl.hidden = false;

renderAchievements();
startGame();
