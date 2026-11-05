// תרגול: הפעלה. נטען אחרון, אחרי שכל הפונקציות מוגדרות.

// כמה כפתורים נכנסים בשורה (לפחות --min-btn, ברירת מחדל 85px לכפתור), כמו grid auto-fit, אבל השורה האחרונה ממורכזת
function fitOptionsGrid(grid) {
  const width = grid.clientWidth;
  if (!width) return;
  const style = getComputedStyle(grid);
  const gap = parseFloat(style.columnGap) || 0;
  const minBtn = parseFloat(style.getPropertyValue('--min-btn')) || 85;
  const fit = Math.max(1, Math.floor((width + gap) / (minBtn + gap)));
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
if (!loadExerciseFromUrl() && !isTrainMode()) {
  startPractice();
}

// "על מה לוחצים?": הסבר קצר על תפעול המסך הנוכחי
HelpPanel.init({
  anchor: document.querySelector('.topbar'),
  topic: () => {
    const b = document.body.classList;
    if (b.contains('in-rewards')) return 'rewards';
    if (b.contains('in-daily')) return 'daily';
    if (appMode === 'train') return b.contains('in-session') ? 'ear:session' : 'ear:train';
    return appMode + ':' + document.getElementById('exType').value;
  }
});
