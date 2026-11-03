// תרגול: מצבי הדף (קריאה, שמיעה חופשית, לפי שלבים), רמות האימון, התרגול היומי והדוח.

// ---------- אימון שמיעה לפי רמות ----------
const TRAINING_LENGTH = 20;
const HISTORY_KEY = 'mt_training_history';

// באוזן אין הבדל בין מרווחים אנהרמוניים: סקונדה מוגדלת נשמעת כטרצה קטנה, קווינטה מוגדלת כסקסטה קטנה,
// וקוורטה מוגדלת וקווינטה מוקטנת הן טריטון אחד. בשמיעה נשאר כפתור אחד לכל מרחק, ורק בקריאה הכתיב חשוב.
const EAR_HIDDEN_INTERVALS = ['A2', 'd5', 'A5'];

function earStructures(type) {
  if (type !== 'intervals') return BASE_STRUCTURES[type];
  return BASE_STRUCTURES[type]
    .filter(st => !EAR_HIDDEN_INTERVALS.includes(st.id))
    .map(st => st.id === 'A4' ? { ...st, name: 'טריטון', abbr: 'טריטון' } : st);
}

function optionStructures(type) {
  return appMode === 'read' ? BASE_STRUCTURES[type] : earStructures(type);
}

function structsById(type, ids) {
  return ids.map(id => earStructures(type).find(x => x.id === id));
}

const EAR_INTERVALS = ['m2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
// נגינה מלמעלה למטה קשה יותר לשמיעה, אז היא מגיעה רק אחרי שהעולה וההרמוני כבר מוכרים
const UP_PLAY = ['harmonic', 'ascending'];
const EAR_LEVELS = [
  { name: 'רמה 1', desc: 'טרצות, קווינטה ואוקטבה, עולים', cats: [
    { label: 'מרווחים עולים', type: 'intervals', ids: ['m3', 'M3', 'P5', 'P8'], play: 'ascending' }
  ]},
  { name: 'רמה 2', desc: 'כל המרווחים, עולים', cats: [
    { label: 'מרווחים עולים', type: 'intervals', ids: EAR_INTERVALS, play: 'ascending' }
  ]},
  { name: 'רמה 3', desc: 'מרווחים הרמוניים, משולשים מז׳ור ומינור', cats: [
    { label: 'מרווחים הרמוניים', type: 'intervals', ids: EAR_INTERVALS, play: 'harmonic' },
    { label: 'משולשים', type: 'chords', ids: ['major', 'minor'], inversions: [0], play: 'harmonic' }
  ]},
  { name: 'רמה 4', desc: 'מרווחים יורדים, כל המשולשים וההיפוכים', cats: [
    { label: 'מרווחים יורדים', type: 'intervals', ids: EAR_INTERVALS, play: 'descending' },
    { label: 'משולשים', type: 'chords', ids: ['major', 'minor', 'diminished', 'augmented'], inversions: [0, 1, 2], play: UP_PLAY }
  ]},
  { name: 'רמה 5', desc: 'ספטאקורדים עיקריים, מז׳ור ומינור טבעי', cats: [
    { label: 'ספטאקורדים', type: 'septachords', ids: ['major7', 'dominant7', 'minor7', 'half_diminished'], inversions: [0], play: UP_PLAY },
    { label: 'סולמות', type: 'scales', ids: ['major', 'minor_natural'] }
  ]},
  { name: 'רמה 6', desc: 'אקורדים גם מלמעלה למטה, כל סוגי המינור', cats: [
    { label: 'משולשים', type: 'chords', ids: ['major', 'minor', 'diminished', 'augmented'], inversions: [0, 1, 2], play: 'random' },
    { label: 'ספטאקורדים', type: 'septachords', ids: ['major7', 'dominant7', 'minor7', 'half_diminished'], inversions: [0], play: 'random' },
    { label: 'סולמות', type: 'scales', ids: ['major', 'minor_natural', 'minor_harmonic', 'minor_melodic'] }
  ]},
  { name: 'רמה 7', desc: 'כל הספטאקורדים וההיפוכים, מודוסים', cats: [
    { label: 'ספטאקורדים', type: 'septachords', ids: T.CATALOG.septachords.map(x => x.id), inversions: [0, 1, 2, 3], play: 'random' },
    { label: 'מודוסים', type: 'modes', ids: T.CATALOG.modes.map(x => x.id) }
  ]}
];

let appMode = 'read';
let training = null;
let firstWrong = null;
let helpUsed = false; // לרצף התשובות הנכונות: תשובה אחרי עזרה לא נספרת

function noteWrong(label, kind = 'type') {
  if (!firstWrong) firstWrong = { label, kind };
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch (e) { return []; }
}

function saveHistory(entry) {
  try {
    const h = loadHistory();
    h.push(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-200)));
  } catch (e) { /* בלי אחסון, הדוח עדיין מוצג */ }
}

function setAppMode(mode, initial = false) {
  const spellingChanged = (appMode === 'read') !== (mode === 'read');
  appMode = mode;
  if (window.Rewards && document.body.classList.contains('in-rewards')) Rewards.close();
  try { localStorage.setItem('mt_app_mode', mode); } catch (e) {}
  document.body.classList.remove('mode-read', 'mode-ear', 'mode-train', 'in-session', 'in-daily');
  document.body.classList.add('mode-' + mode);
  document.querySelectorAll('#modeTabs button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.body.dataset.section = mode === 'read' ? 'read' : 'ear';
  if (window.SiteNav) SiteNav.setActive(document.body.dataset.section);
  document.getElementById('pageTitle').textContent = mode === 'read' ? 'תרגול קריאה' : 'תרגול שמיעה';
  document.getElementById('displayMode').value = mode === 'read' ? 'both' : 'audio_only';
  training = null;
  const exType = document.getElementById('exType');
  if (mode !== 'read' && exType.value === 'note_id') {
    exType.value = 'intervals';
    onExerciseTypeChange();
  } else if (spellingChanged && exType.value === 'intervals') {
    updateOptionsList();
  }
  closeSettings();
  if (mode === 'train') {
    showLevelPicker();
    return;
  }
  document.getElementById('trainingPanel').style.display = 'none';
  document.getElementById('practiceArea').style.display = 'flex';
  updateTopbarProgress();
  if (!initial) {
    document.getElementById('sharedNote').hidden = true;
    goToNextExercise();
  }
}

function showLevelPicker() {
  const panel = document.getElementById('trainingPanel');
  const history = loadHistory();
  document.getElementById('practiceArea').style.display = 'none';
  panel.style.display = 'block';
  updateTopbarProgress();
  const items = EAR_LEVELS.map((lv, i) => {
    const runs = history.filter(h => h.level === i);
    const best = runs.length ? Math.max(...runs.map(h => Math.round(100 * h.correct / h.total))) : null;
    return `<button class="level-item" onclick="startTraining(${i})">
      <div><div class="lv-name">${lv.name}</div><div class="lv-desc">${lv.desc}</div></div>
      <div class="lv-best">${best === null ? '' : 'שיא ' + best + '%'}</div>
    </button>`;
  }).join('');
  panel.innerHTML = `<h2>אימון שמיעה</h2>
    <p class="sub">בוחרים רמה ומקבלים ${TRAINING_LENGTH} תרגילים. נספרת רק התשובה הראשונה, ובסוף מקבלים דוח.</p>
    <div class="level-list">${items}</div>`;
}

function buildTrainingPlan(level) {
  const cats = EAR_LEVELS[level].cats.map(c => ({
    label: c.label, type: c.type, pool: structsById(c.type, c.ids), inversions: c.inversions || [0], play: c.play || null
  }));
  const plan = [];
  for (let i = 0; i < TRAINING_LENGTH; i++) plan.push(cats[i % cats.length]);
  for (let i = plan.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [plan[i], plan[j]] = [plan[j], plan[i]];
  }
  return plan;
}

function startTraining(level) {
  training = { level, plan: buildTrainingPlan(level), index: 0, results: [] };
  document.body.classList.add('in-session');
  document.getElementById('trainingPanel').style.display = 'none';
  document.getElementById('practiceArea').style.display = 'flex';
  currentExercise = null;
  goToNextExercise();
}

// המיומנות של התרגיל הנוכחי, לפי מה שמוצג: חמשה = קריאה, השמעה בלבד = שמיעה
function currentSkill() {
  if (!currentExercise) return null;
  const ear = document.getElementById('displayMode').value === 'audio_only';
  return (ear ? 'ear:' : 'read:') + currentExercise.type;
}

// תרגול יומי: תוכנית מהמיומנויות שהמתרגל בחר (נבנית ב-rewards.js), ורצה כמו אימון עם דוח בסוף
function startDailyMix(items) {
  const invs = { chords: [0, 1, 2], septachords: [0, 1, 2, 3] };
  const plan = items.map(it => ({
    label: it.label, type: it.type, display: it.mode === 'read' ? 'both' : 'audio_only',
    pool: it.type === 'note_id' ? [] : (it.mode === 'read' ? BASE_STRUCTURES[it.type] : earStructures(it.type)),
    inversions: invs[it.type] || [0], play: null
  }));
  closeSettings();
  document.getElementById('sharedNote').hidden = true;
  training = { daily: true, level: null, plan, index: 0, results: [] };
  document.body.classList.add('in-session', 'in-daily');
  document.getElementById('trainingPanel').style.display = 'none';
  document.getElementById('practiceArea').style.display = 'flex';
  currentExercise = null;
  goToNextExercise();
}

function recordTrainingResult() {
  const ex = currentExercise;
  const hasInv = ex.inversionsPool && ex.inversionsPool.length > 1 && !inversionIrrelevant(ex.type, ex.struct);
  training.results.push({
    category: ex.category,
    item: ex.struct ? ex.struct.name : ex.correctNote.name,
    inversion: hasInv ? INVERSIONS_DATA[ex.type].find(i => i.id === ex.inversion).name : null,
    correct: !firstWrong,
    wrong: firstWrong
  });
  training.index++;
}

function skipExercise() {
  if (!exerciseSolved && window.Rewards) Rewards.broke(currentSkill());
  if (training && !exerciseSolved) {
    noteWrong('דילוג', 'skip');
    exerciseSolved = true;
    recordTrainingResult();
  }
  goToNextExercise();
}

function endTraining() {
  if (training && training.results.length) showTrainingReport();
  else setAppMode('train');
}

function updateTopbarProgress() {
  const label = document.getElementById('scoreLabel');
  const value = document.getElementById('scoreDisplay');
  if (training) {
    label.innerText = '';
    value.innerText = `${Math.min(training.index + 1, training.plan.length)} מתוך ${training.plan.length}`;
  } else if (appMode === 'train') {
    label.innerText = '';
    value.innerText = '';
  } else {
    label.innerText = 'ניקוד ';
    value.innerText = currentScore;
  }
}

function groupStats(results, keyFn) {
  const map = new Map();
  results.forEach(r => {
    const k = keyFn(r);
    if (!map.has(k)) map.set(k, { key: k, total: 0, correct: 0 });
    const g = map.get(k);
    g.total++;
    if (r.correct) g.correct++;
  });
  return [...map.values()];
}

function statRow(g) {
  const pct = Math.round(100 * g.correct / g.total);
  return `<div class="report-row"><div>${g.key}</div><div class="report-bar"><span style="width:${pct}%"></span></div><div class="num">${g.correct}/${g.total}</div></div>`;
}

function resumeTraining() {
  document.getElementById('trainingPanel').style.display = 'none';
  document.getElementById('practiceArea').style.display = 'flex';
  window.scrollTo(0, 0);
}

// partial: דוח ביניים באמצע אימון. האימון נשאר פתוח ולא נשמר בהיסטוריה
function showTrainingReport(partial = false) {
  const t = training;
  const results = t.results;
  const total = results.length;
  const correct = results.filter(r => r.correct).length;
  const pct = total ? Math.round(100 * correct / total) : 0;
  if (!partial && !t.daily) saveHistory({ t: Date.now(), level: t.level, correct, total });
  if (!partial && !t.daily && window.Rewards) Rewards.trainingDone(t.level, pct);

  const byCat = groupStats(results, r => r.category);
  const byItem = groupStats(results, r => r.item).sort((a, b) => a.correct / a.total - b.correct / b.total);
  const invResults = results.filter(r => r.inversion);
  const byInv = groupStats(invResults, r => r.inversion);

  const confusions = new Map();
  results.filter(r => !r.correct && r.wrong && r.wrong.kind === 'type').forEach(r => {
    const k = `שמעת ${r.item} וענית ${r.wrong.label}`;
    confusions.set(k, (confusions.get(k) || 0) + 1);
  });
  const confList = [...confusions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([k, n]) => `<li>${k}${n > 1 ? ` (${n} פעמים)` : ''}</li>`).join('');

  const strong = byItem.filter(g => g.correct === g.total && g.total >= 2).map(g => g.key);
  const weak = byItem.filter(g => g.correct / g.total < 0.7).map(g => g.key);
  const hasNext = !t.daily && t.level < EAR_LEVELS.length - 1;
  let advice;
  if (partial) {
    advice = total ? `ענית על ${total} מתוך ${t.plan.length} תרגילים. ההמלצה לרמה הבאה תופיע בסוף האימון.` : 'עוד לא ענית על אף תרגיל.';
  } else if (t.daily) {
    const weakCats = byCat.filter(g => g.correct / g.total < 0.75).map(g => g.key);
    advice = weakCats.length ? `כדאי לחזק: ${weakCats.join(', ')}. התרגול של מחר ייתן להן יותר מקום.` : 'מצוין. כל המיומנויות שבחרת עברו טוב.';
  } else if (pct >= 85) {
    advice = hasNext ? 'מצוין. אפשר לעבור לרמה הבאה.' : 'מצוין. סיימת את הרמה הגבוהה ביותר.';
  } else if (weak.length) {
    advice = 'כדאי לחזור על הרמה הזו, עם דגש על מה שמופיע למטה בחיזוק.';
  } else {
    advice = 'כמעט שם. עוד סבב אחד ברמה הזו ואפשר להתקדם.';
  }

  if (!partial) {
    training = null;
    document.body.classList.remove('in-session');
  }
  document.getElementById('practiceArea').style.display = 'none';
  const panel = document.getElementById('trainingPanel');
  panel.style.display = 'block';
  updateTopbarProgress();
  const actions = partial || !t.daily ? null : `<button class="primary" onclick="Rewards.startDaily()">עוד סבב</button>
      <button onclick="Rewards.open()">המיומנויות שלי</button>
      <button onclick="setAppMode(appMode)">תרגול חופשי</button>`;
  const actionsHtml = actions || (partial
    ? `<button class="primary" onclick="resumeTraining()">המשך אימון</button>
      <button onclick="endTraining()">סיום אימון</button>`
    : `${hasNext && pct >= 85 ? `<button class="primary" onclick="startTraining(${t.level + 1})">לרמה הבאה</button>` : ''}
      <button class="${hasNext && pct >= 85 ? '' : 'primary'}" onclick="startTraining(${t.level})">שוב ברמה הזו</button>
      <button onclick="showLevelPicker()">כל הרמות</button>`);
  panel.innerHTML = `<h2>${t.daily ? 'תרגול יומי' : EAR_LEVELS[t.level].name}: ${partial ? 'דוח עד כה' : 'סיכום'}</h2>
    ${total ? `<div class="report-score">${pct}%</div>
    <p class="sub">${correct} נכונות מתוך ${total} בניסיון הראשון</p>` : ''}
    <div class="report-section"><p class="report-advice">${advice}</p></div>
    ${byCat.length > 1 ? `<div class="report-section"><h3>לפי קטגוריה</h3>${byCat.map(statRow).join('')}</div>` : ''}
    ${total ? `<div class="report-section"><h3>לפי סוג</h3>${byItem.map(statRow).join('')}</div>` : ''}
    ${byInv.length ? `<div class="report-section"><h3>היפוכים</h3>${byInv.map(statRow).join('')}</div>` : ''}
    ${strong.length ? `<div class="report-section"><h3>חזק</h3><p class="report-advice">${strong.join(', ')}</p></div>` : ''}
    ${weak.length ? `<div class="report-section"><h3>לחיזוק</h3><p class="report-advice">${weak.join(', ')}</p></div>` : ''}
    ${confList ? `<div class="report-section"><h3>בלבולים נפוצים</h3><ul class="report-list">${confList}</ul></div>` : ''}
    <div class="report-actions">
      ${actionsHtml}
    </div>`;
  window.scrollTo(0, 0);
}

function initialAppMode() {
  const fromUrl = new URLSearchParams(location.search).get('mode');
  if (['read', 'ear', 'train'].includes(fromUrl)) return fromUrl;
  try {
    const saved = localStorage.getItem('mt_app_mode');
    if (['read', 'ear', 'train'].includes(saved)) return saved;
  } catch (e) {}
  return 'read';
}
