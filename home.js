const completedBadges = [
  ['clicker', 'clickerGameCompleted'],
  ['memory', 'memoryMatchCompleted'],
  ['merge', 'numberMergeCompleted'],
  ['sudoku', 'untitledSudokuCompleted'],
  ['math', 'untitledMathSprintCompleted'],
  ['tictactoe', 'ticTacToeCompleted']
];

function IsCompleted(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch (e) {
    return false;
  }
}

completedBadges.forEach(([name, key]) => {
  const badge = document.querySelector(`[data-completed-badge="${name}"]`);
  if (badge && IsCompleted(key)) {
    badge.hidden = false;
  }
});
