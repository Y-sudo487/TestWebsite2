const STATS_KEY = 'untitledMathSprintStats';
const COMPLETED_KEY = 'untitledMathSprintCompleted';

const VARIANTS = {
  classic: { label: 'Classic', seconds: 60, ops: ['+', '-', '×'] },
  blitz: { label: 'Blitz', seconds: 30, ops: ['+', '-', '×'] },
  marathon: { label: 'Marathon', seconds: 120, ops: ['+', '-', '×'] },
  multiply: { label: 'Multiply', seconds: 60, ops: ['×'] },
  addsub: { label: 'Add / Sub', seconds: 60, ops: ['+', '-'] }
};

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const streakEl = document.getElementById('streak');
const timeEl = document.getElementById('time');
const problemEl = document.getElementById('problem');
const answerForm = document.getElementById('answerForm');
const answerEl = document.getElementById('answer');
const startBtn = document.getElementById('startBtn');
const achievementListEl = document.getElementById('achievementList');
const overlayEl = document.getElementById('overlay');
const overlayTitleEl = document.getElementById('overlayTitle');
const overlaySummaryEl = document.getElementById('overlaySummary');
const primaryBtn = document.getElementById('primaryBtn');
const secondaryBtn = document.getElementById('secondaryBtn');
const toastEl = document.getElementById('toast');
const completedBadgeEl = document.getElementById('completedBadge');
const chips = document.querySelectorAll('.chip');

const defaultStats = {
  unlocked: [],
  best: {},
  played: [],
  rounds: 0,
  totalCorrect: 0,
  bestStreak: 0
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
        played: saved.played || []
      };

      // Migrate the old single-mode best into the Classic slot.
      if (typeof saved.bestScore === 'number' && !merged.best.classic) {
        merged.best.classic = saved.bestScore;
      }
      delete merged.bestScore;

      return merged;
    }
  } catch (e) {
    console.warn('Could not load math sprint stats:', e);
  }
  return { ...defaultStats, best: {}, played: [] };
}

function saveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn('Could not save math sprint stats:', e);
  }
}

const stats = loadStats();

const achievements = [
  { id: 'firstAnswer', label: 'First Answer', check: v => v.correct >= 1 },
  { id: 'tenCorrect', label: '10 Correct', check: v => v.correct >= 10 },
  { id: 'twentyFiveCorrect', label: '25 Correct', check: v => v.correct >= 25 },
  { id: 'fiftyCorrect', label: '50 Correct', check: v => v.correct >= 50 },
  { id: 'streak10', label: 'Streak 10', check: v => v.bestStreak >= 10 },
  { id: 'streak20', label: 'Streak 20', check: v => v.bestStreak >= 20 },
  { id: 'streak30', label: 'Streak 30', check: v => v.bestStreak >= 30 },
  { id: 'perfectTen', label: 'Perfect 10', check: v => v.correct >= 10 && v.wrong === 0 },
  { id: 'perfect20', label: 'Perfect 20', check: v => v.correct >= 20 && v.wrong === 0 },
  { id: 'blitz10', label: 'Blitz 10', check: v => v.variant === 'blitz' && v.correct >= 10 },
  { id: 'marathon40', label: 'Marathon 40', check: v => v.variant === 'marathon' && v.correct >= 40 },
  { id: 'multiply20', label: 'Multiply 20', check: v => v.variant === 'multiply' && v.correct >= 20 },
  { id: 'addsub30', label: 'Add / Sub 30', check: v => v.variant === 'addsub' && v.correct >= 30 },
  { id: 'best25', label: 'Best 25', check: v => v.bestMax >= 25 },
  { id: 'best50', label: 'Best 50', check: v => v.bestMax >= 50 },
  { id: 'allModes', label: 'All Modes', check: v => v.played.length >= 5 },
  { id: 'century', label: 'Century', check: v => v.totalCorrect >= 100 },
  { id: 'rounds10', label: '10 Rounds', check: v => v.rounds >= 10 }
];

let variantKey = 'classic';
let variant = VARIANTS[variantKey];
let problem = null;
let correct = 0;
let wrong = 0;
let streak = 0;
let bestStreak = 0;
let timeLeft = variant.seconds;
let running = false;
let tickId = null;

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function makeProblem() {
  const op = variant.ops[randomInt(0, variant.ops.length - 1)];

  if (op === '+') {
    const a = randomInt(2, 20);
    const b = randomInt(2, 20);
    return { text: `${a} + ${b}`, answer: a + b };
  }

  if (op === '-') {
    const a = randomInt(10, 30);
    const b = randomInt(2, a - 1);
    return { text: `${a} − ${b}`, answer: a - b };
  }

  const a = randomInt(2, 12);
  const b = randomInt(2, 12);
  return { text: `${a} × ${b}`, answer: a * b };
}

function nextProblem() {
  problem = makeProblem();
  problemEl.textContent = problem.text;
}

function startTimer() {
  tickId = setInterval(() => {
    timeLeft -= 1;
    timeEl.textContent = `${timeLeft}s`;

    if (timeLeft <= 0) endRound();
  }, 1000);
}

function stopTimer() {
  clearInterval(tickId);
  tickId = null;
}

function startRound(nextVariant = variantKey) {
  if (!VARIANTS[nextVariant]) nextVariant = 'classic';

  stopTimer();
  variantKey = nextVariant;
  variant = VARIANTS[variantKey];

  correct = 0;
  wrong = 0;
  streak = 0;
  bestStreak = 0;
  timeLeft = variant.seconds;
  running = true;

  if (!stats.played.includes(variantKey)) {
    stats.played.push(variantKey);
    saveStats();
  }

  chips.forEach(chip => {
    chip.classList.toggle('is-active', chip.dataset.variant === variantKey);
  });

  scoreEl.textContent = '0';
  bestEl.textContent = stats.best[variantKey] || 0;
  streakEl.textContent = '0';
  timeEl.textContent = `${variant.seconds}s`;

  hideOverlay();
  startBtn.textContent = 'Restart';
  nextProblem();

  answerEl.value = '';
  answerEl.disabled = false;
  answerEl.classList.remove('is-wrong');
  answerEl.focus();

  checkAchievements();
  startTimer();
}

function endRound() {
  if (!running) return;
  running = false;
  stopTimer();

  answerEl.disabled = true;
  answerEl.classList.remove('is-wrong');
  startBtn.textContent = 'Start round';

  if (correct > (stats.best[variantKey] || 0)) {
    stats.best[variantKey] = correct;
  }
  stats.rounds += 1;
  stats.totalCorrect += correct;
  stats.bestStreak = Math.max(stats.bestStreak, bestStreak);
  saveStats();

  bestEl.textContent = stats.best[variantKey] || 0;
  checkAchievements();

  const attempts = correct + wrong;
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
  showOverlay(
    'Time!',
    `${variant.label} · ${correct} correct · ${accuracy}% accuracy · best ${stats.best[variantKey] || 0}`,
    'Play again',
    () => startRound(variantKey)
  );
}

function submitAnswer(event) {
  event.preventDefault();
  if (!running || !answerEl.value.trim()) return;

  const value = Number(answerEl.value);
  answerEl.value = '';

  if (value === problem.answer) {
    correct += 1;
    streak += 1;
    bestStreak = Math.max(bestStreak, streak);
    scoreEl.textContent = correct;
    streakEl.textContent = streak;
    checkAchievements();
    nextProblem();
    return;
  }

  wrong += 1;
  streak = 0;
  streakEl.textContent = '0';
  answerEl.classList.remove('is-wrong');
  void answerEl.offsetWidth;
  answerEl.classList.add('is-wrong');
}

function checkAchievements() {
  const view = {
    correct,
    wrong,
    bestStreak: Math.max(stats.bestStreak, bestStreak),
    variant: variantKey,
    played: stats.played,
    totalCorrect: stats.totalCorrect + (running ? correct : 0),
    rounds: stats.rounds,
    bestMax: Math.max(correct, ...Object.values(stats.best))
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
  overlayEl.hidden = false;
  primaryBtn.focus();
}

function hideOverlay() {
  overlayEl.hidden = true;
}

answerEl.addEventListener('input', () => {
  const digits = answerEl.value.replace(/\D/g, '').slice(0, 4);
  if (digits !== answerEl.value) answerEl.value = digits;
});

answerForm.addEventListener('submit', submitAnswer);
startBtn.addEventListener('click', () => startRound());
chips.forEach(chip => {
  chip.addEventListener('click', () => startRound(chip.dataset.variant));
});
secondaryBtn.addEventListener('click', () => {
  window.location.href = '../index.html';
});

if (hasCompletedBadge()) completedBadgeEl.hidden = false;

bestEl.textContent = stats.best[variantKey] || 0;
renderAchievements();
