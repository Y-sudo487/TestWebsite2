const STATS_KEY = 'ticTacToeStats';
const COMPLETED_KEY = 'ticTacToeCompleted';

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const defaultStats = {
  unlocked: [],
  wins: 0,
  losses: 0,
  draws: 0,
  streak: 0,
  bestStreak: 0,
  games: 0,
  totalMoves: 0,
  aiGames: 0,
  aiWins: 0,
  twoPlayerGames: 0,
  twoPlayerWins: 0
};

const boardEl = document.getElementById('board');
const winsEl = document.getElementById('wins');
const drawsEl = document.getElementById('draws');
const streakEl = document.getElementById('streak');
const bestEl = document.getElementById('best');
const statusEl = document.getElementById('status');
const achievementListEl = document.getElementById('achievementList');
const completedBadgeEl = document.getElementById('completedBadge');
const toastEl = document.getElementById('toast');
const restartBtn = document.getElementById('restartBtn');
const chips = document.querySelectorAll('.chip');

function LoadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATS_KEY));
    if (saved) {
      return {
        ...defaultStats,
        ...saved,
        unlocked: saved.unlocked || []
      };
    }
  } catch (e) {
    console.warn('Could not load tic-tac-toe stats:', e);
  }
  return { ...defaultStats, unlocked: [] };
}

function SaveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn('Could not save tic-tac-toe stats:', e);
  }
}

const stats = LoadStats();

const achievements = [
  { id: 'firstGame', label: 'First Game', description: 'Finish your first game.', check: v => v.games >= 1 },
  { id: 'firstWin', label: 'First Win', description: 'Win your first game.', check: v => v.wins >= 1 },
  { id: 'aiSlayer', label: 'AI Slayer', description: 'Beat the computer.', check: v => v.aiWins >= 1 },
  { id: 'quickWin', label: 'Quick Win', description: 'Win in 5 moves or fewer.', check: v => v.won && v.moves <= 5 },
  { id: 'streak3', label: 'Hot Streak', description: 'Win 3 games in a row.', check: v => v.bestStreak >= 3 },
  { id: 'unstoppable', label: 'Unstoppable', description: 'Win 5 games in a row.', check: v => v.bestStreak >= 5 },
  { id: 'draw', label: 'Dead Heat', description: 'Finish a game in a draw.', check: v => v.draws >= 1 },
  { id: 'duelist', label: 'Duelist', description: 'Win a 2-player game.', check: v => v.twoPlayerWins >= 1 },
  { id: 'explorer', label: 'Explorer', description: 'Win against the computer and in 2-player mode.', check: v => v.aiWins >= 1 && v.twoPlayerWins >= 1 },
  { id: 'regular', label: 'Regular', description: 'Play 10 games.', check: v => v.games >= 10 },
  { id: 'champion', label: 'Champion', description: 'Win 5 games.', check: v => v.wins >= 5 },
  { id: 'rival', label: 'Rivalry', description: 'Play 5 two-player games.', check: v => v.twoPlayerGames >= 5 },
  { id: 'grinder', label: 'Grinder', description: 'Make 100 total moves across all games.', check: v => v.totalMoves >= 100 }
];

let mode = 'ai';
let board = Array(9).fill('');
let current = 'X';
let moves = 0;
let over = false;
let winLine = null;
let aiTimer = null;
let cells = [];

function BuildBoard() {
  boardEl.innerHTML = '';
  cells = [];

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    cell.dataset.index = String(i);
    cell.addEventListener('click', () => HandleCellClick(i));
    boardEl.appendChild(cell);
    cells.push(cell);
  }
}

function RenderBoard() {
  cells.forEach((cell, i) => {
    const mark = board[i];
    const isWinning = Boolean(winLine && winLine.includes(i));
    cell.textContent = mark;
    cell.className = 'cell' + (mark ? ` ${mark.toLowerCase()}` : '') + (isWinning ? ' win' : '');

    const row = Math.floor(i / 3) + 1;
    const col = (i % 3) + 1;
    cell.setAttribute('aria-label', `Row ${row}, column ${col}${mark ? `, ${mark}` : ', empty'}`);

    const aiThinking = mode === 'ai' && current === 'O' && !over;
    cell.disabled = Boolean(mark) || over || aiThinking;
  });
}

function RenderStats() {
  winsEl.textContent = FormatNumber(stats.wins);
  drawsEl.textContent = FormatNumber(stats.draws);
  streakEl.textContent = FormatNumber(stats.streak);
  bestEl.textContent = FormatNumber(stats.bestStreak);
}

function SetStatus(text, variant) {
  statusEl.textContent = text;
  statusEl.className = 'status' + (variant ? ` status--${variant}` : '');
}

function RenderStatus() {
  if (over) return;

  if (mode === 'ai') {
    SetStatus(current === 'X' ? 'Your turn - you are X' : 'Computer is thinking…');
  } else {
    SetStatus(`${current}'s turn`);
  }
}

function PlaceMark(index, mark) {
  board[index] = mark;
  moves += 1;
  RenderBoard();
}

function FindWinningMove(mark) {
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;

    board[i] = mark;
    const wins = WIN_LINES.some(line => line.every(index => board[index] === mark));
    board[i] = '';

    if (wins) return i;
  }
  return null;
}

function PickRandom(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function ChooseAiMove() {
  const empty = board.reduce((list, mark, index) => {
    if (!mark) list.push(index);
    return list;
  }, []);

  if (!empty.length) return null;

  const winningMove = FindWinningMove('O');
  if (winningMove !== null) return winningMove;

  const blockingMove = FindWinningMove('X');
  if (blockingMove !== null) return blockingMove;

  if (!board[4]) return 4;

  const corners = empty.filter(index => [0, 2, 6, 8].includes(index));
  return PickRandom(corners.length ? corners : empty);
}

function ScheduleAiMove() {
  clearTimeout(aiTimer);
  aiTimer = setTimeout(() => {
    aiTimer = null;
    if (mode !== 'ai' || over || current !== 'O') return;

    const move = ChooseAiMove();
    if (move === null) return;

    PlaceMark(move, 'O');
    if (EvaluateBoard()) return;

    current = 'X';
    RenderStatus();
    RenderBoard();
  }, 350);
}

function HandleCellClick(index) {
  if (over || board[index]) return;
  if (mode === 'ai' && current !== 'X') return;

  const mark = current;
  PlaceMark(index, mark);
  if (EvaluateBoard()) return;

  current = mark === 'X' ? 'O' : 'X';

  if (mode === 'ai') {
    RenderStatus();
    RenderBoard();
    ScheduleAiMove();
  } else {
    RenderStatus();
    RenderBoard();
  }
}

function EvaluateBoard() {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      winLine = line;
      over = true;
      FinishGame(board[a]);
      return true;
    }
  }

  if (moves === 9) {
    over = true;
    FinishGame(null);
    return true;
  }

  return false;
}

function FinishGame(winner) {
  stats.games += 1;
  stats.totalMoves += moves;

  if (mode === 'ai') {
    stats.aiGames += 1;
  } else {
    stats.twoPlayerGames += 1;
  }

  if (winner === 'X') {
    stats.wins += 1;
    stats.streak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);

    if (mode === 'ai') {
      stats.aiWins += 1;
      SetStatus('You win! 🎉', 'win');
    } else {
      stats.twoPlayerWins += 1;
      SetStatus('X wins!', 'win');
    }
  } else if (winner === 'O') {
    stats.losses += 1;
    stats.streak = 0;

    if (mode === 'ai') {
      SetStatus('Computer wins - try again!', 'lose');
    } else {
      SetStatus('O wins!', 'lose');
    }
  } else {
    stats.draws += 1;
    stats.streak = 0;
    SetStatus("It's a draw.", 'draw');
  }

  SaveStats();
  RenderStats();
  RenderBoard();
  CheckAchievements({ won: winner === 'X', moves });
}

function CheckAchievements(result) {
  const view = {
    games: stats.games,
    wins: stats.wins,
    draws: stats.draws,
    bestStreak: stats.bestStreak,
    aiWins: stats.aiWins,
    twoPlayerGames: stats.twoPlayerGames,
    twoPlayerWins: stats.twoPlayerWins,
    totalMoves: stats.totalMoves,
    won: result.won,
    moves: result.moves
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

function StartGame() {
  clearTimeout(aiTimer);
  aiTimer = null;

  // Walking away from a game that was already underway breaks the win streak.
  if (!over && moves > 0) {
    stats.streak = 0;
    SaveStats();
    RenderStats();
  }

  board = Array(9).fill('');
  current = 'X';
  moves = 0;
  over = false;
  winLine = null;

  RenderBoard();
  RenderStatus();
}

chips.forEach(chip => {
  chip.addEventListener('click', () => {
    if (chip.dataset.mode === mode) return;

    mode = chip.dataset.mode;
    chips.forEach(button => {
      button.classList.toggle('is-active', button.dataset.mode === mode);
    });
    StartGame();
  });
});

restartBtn.addEventListener('click', StartGame);

if (HasCompletedBadge()) completedBadgeEl.hidden = false;

BuildBoard();
RenderAchievements();
RenderStats();
StartGame();
