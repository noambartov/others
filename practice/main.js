// תרגול: הפעלה. נטען אחרון, אחרי שכל הפונקציות מוגדרות.

// כמה כפתורים נכנסים בשורה (לפחות 85px לכפתור), כמו grid auto-fit, אבל השורה האחרונה ממורכזת
function fitOptionsGrid(grid) {
  const width = grid.clientWidth;
  if (!width) return;
  const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
  const fit = Math.max(1, Math.floor((width + gap) / (85 + gap)));
  grid.style.setProperty('--cols', Math.max(1, Math.min(grid.children.length, fit)));
}
const gridResize = new ResizeObserver(entries => entries.forEach(e => fitOptionsGrid(e.target)));
const gridChildren = new MutationObserver(records => records.forEach(r => fitOptionsGrid(r.target)));
document.querySelectorAll('.options-grid').forEach(g => {
  gridResize.observe(g);
  gridChildren.observe(g, { childList: true });
});

onExerciseTypeChange();
loadSamples(document.getElementById('instrumentSelect').value);
initSilentTip();
const fromLink = new URLSearchParams(location.search).has('exData');
setAppMode(fromLink ? 'read' : initialAppMode(), true);
applySharedSettings();
if (!loadExerciseFromUrl() && appMode !== 'train') {
  startPractice();
}
