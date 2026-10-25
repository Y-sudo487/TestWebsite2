const completedBadges = [
  ['clicker', 'clickerGameCompleted'],
  ['memory', 'memoryMatchCompleted'],
  ['merge', 'numberMergeCompleted'],
  ['sudoku', 'untitledSudokuCompleted'],
  ['math', 'untitledMathSprintCompleted']
];

function isCompleted(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch (e) {
    return false;
  }
}

completedBadges.forEach(([name, key]) => {
  const badge = document.querySelector(`[data-completed-badge="${name}"]`);
  if (badge && isCompleted(key)) {
    badge.hidden = false;
  }
});
