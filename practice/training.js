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
  return isReadMode() ? BASE_STRUCTURES[type] : earStructures(type);
}

function structsById(type, ids) {
  return ids.map(id => optionStructures(type).find(x => x.id === id));
}

// קריאה: חופשי (read) או לפי שלבים (rtrain). שמיעה: חופשי (ear) או לפי שלבים (train)
function isReadMode(mode = appMode) { return mode === 'read' || mode === 'rtrain'; }
function isTrainMode(mode = appMode) { return mode === 'train' || mode === 'rtrain'; }

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
].concat(progressionLevels());

// מהלכים הרמוניים: שלב לכל נושא, לפי סדר הספר של אלדוול ושכטר. כל שלב כולל את כל מה שלפניו.
// מהשלב של הסובדומיננטה, רבע מהתרגילים הם שאלות "איך זה נגמר?"
function progressionLevels() {
  const H = window.HarmonyCore;
  return H.TOPICS.map((topic, i) => {
    const stage = i + 1;
    const prog = { label: 'מהלכים הרמוניים', type: 'progressions', stage, kind: 'prog' };
    const cats = stage >= H.CADENCE_FROM ? [prog, prog, prog, { label: 'קדנצות', type: 'progressions', stage, kind: 'cad' }] : [prog];
    return { name: 'מהלכים ' + stage, desc: topic.desc, group: 'מהלכים הרמוניים', cats };
  });
}

// אימון קריאה לפי רמות: קודם קריאת תווים בכל מפתח, ואז מרווחים, אקורדים, סולמות ומודוסים בשני המפתחות.
// clef: sol / fa / rand (שניהם, לסירוגין). acc בזיהוי תווים: without (בלי סימני היתק) או with
const READ_BASIC_INTERVALS = ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
const READ_LEVELS = [
  { name: 'רמה 1', desc: 'תווים במפתח סול', cats: [
    { label: 'תווים', type: 'note_id', clef: 'sol', acc: 'without' }
  ]},
  { name: 'רמה 2', desc: 'תווים במפתח פה', cats: [
    { label: 'תווים', type: 'note_id', clef: 'fa', acc: 'without' }
  ]},
  { name: 'רמה 3', desc: 'תווים בשני המפתחות, עם סימני היתק', cats: [
    { label: 'תווים', type: 'note_id', clef: 'rand', acc: 'with' }
  ]},
  { name: 'רמה 4', desc: 'מרווחים זכים, גדולים וקטנים', cats: [
    { label: 'מרווחים', type: 'intervals', ids: READ_BASIC_INTERVALS, clef: 'rand' }
  ]},
  { name: 'רמה 5', desc: 'כל המרווחים, משולשים מז׳ור ומינור', cats: [
    { label: 'מרווחים', type: 'intervals', ids: T.CATALOG.intervals.map(x => x.id), clef: 'rand' },
    { label: 'משולשים', type: 'chords', ids: ['major', 'minor'], inversions: [0], clef: 'rand' }
  ]},
  { name: 'רמה 6', desc: 'כל המשולשים וההיפוכים, מז׳ור ומינור טבעי', cats: [
    { label: 'משולשים', type: 'chords', ids: ['major', 'minor', 'diminished', 'augmented'], inversions: [0, 1, 2], clef: 'rand' },
    { label: 'סולמות', type: 'scales', ids: ['major', 'minor_natural'], clef: 'rand' }
  ]},
  { name: 'רמה 7', desc: 'ספטאקורדים עיקריים, כל סוגי המינור', cats: [
    { label: 'ספטאקורדים', type: 'septachords', ids: ['major7', 'dominant7', 'minor7', 'half_diminished'], inversions: [0], clef: 'rand' },
    { label: 'סולמות', type: 'scales', ids: ['major', 'minor_natural', 'minor_harmonic', 'minor_melodic'], clef: 'rand' }
  ]},
  { name: 'רמה 8', desc: 'כל הספטאקורדים וההיפוכים, מודוסים', cats: [
    { label: 'ספטאקורדים', type: 'septachords', ids: T.CATALOG.septachords.map(x => x.id), inversions: [0, 1, 2, 3], clef: 'rand' },
    { label: 'מודוסים', type: 'modes', ids: T.CATALOG.modes.map(x => x.id), clef: 'rand' }
  ]}
];
const READ_HISTORY_KEY = 'mt_read_training_history';
const CLEF_NAMES = { sol: 'מפתח סול', fa: 'מפתח פה', alto: 'מפתח אלט' };

function trainLevels(read = isReadMode()) { return read ? READ_LEVELS : EAR_LEVELS; }
function historyKey(read = isReadMode()) { return read ? READ_HISTORY_KEY : HISTORY_KEY; }

let appMode = 'read';
let training = null;
let firstWrong = null;
let helpUsed = false; // לרצף התשובות הנכונות: תשובה אחרי עזרה לא נספרת

function noteWrong(label, kind = 'type') {
  if (!firstWrong) firstWrong = { label, kind };
}

function loadHistory(read = isReadMode()) {
  try { return JSON.parse(localStorage.getItem(historyKey(read))) || []; } catch (e) { return []; }
}

function saveHistory(entry, read = isReadMode()) {
  try {
    const h = loadHistory(read);
    h.push(entry);
    localStorage.setItem(historyKey(read), JSON.stringify(h.slice(-200)));
  } catch (e) { /* בלי אחסון, הדוח עדיין מוצג */ }
}

function setAppMode(mode, initial = false) {
  const spellingChanged = isReadMode() !== isReadMode(mode);
  appMode = mode;
  if (window.Rewards && document.body.classList.contains('in-rewards')) Rewards.close();
  try { localStorage.setItem('mt_app_mode', mode); } catch (e) {}
  document.body.classList.remove('mode-read', 'mode-ear', 'mode-train', 'mode-rtrain', 'in-session', 'in-daily');
  document.body.classList.add('mode-' + mode);
  // אימון הקריאה מתנהג כמו אימון השמיעה (בלי הגדרות התרגול החופשי), אז מקבל גם את mode-train
  if (mode === 'rtrain') document.body.classList.add('mode-train');
  document.querySelectorAll('#modeTabs button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.body.dataset.section = isReadMode(mode) ? 'read' : 'ear';
  if (window.SiteNav) SiteNav.setActive(document.body.dataset.section);
  document.getElementById('pageTitle').textContent = isReadMode(mode) ? 'תרגול קריאה' : 'תרגול שמיעה';
  document.getElementById('displayMode').value = isReadMode(mode) ? 'both' : 'audio_only';
  training = null;
  const exType = document.getElementById('exType');
  if ((!isReadMode(mode) && exType.value === 'note_id') || (isReadMode(mode) && exType.value === 'progressions')) {
    exType.value = 'intervals';
    onExerciseTypeChange();
  } else if (spellingChanged && exType.value === 'intervals') {
    updateOptionsList();
  }
  closeSettings();
  if (isTrainMode(mode)) {
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
  const items = trainLevels().map((lv, i, all) => {
    const runs = history.filter(h => h.level === i);
    const best = runs.length ? Math.max(...runs.map(h => Math.round(100 * h.correct / h.total))) : null;
    const head = lv.group && (i === 0 || all[i - 1].group !== lv.group) ? `<h3 class="level-group">${lv.group}</h3>` : '';
    return `${head}<button class="level-item" onclick="startTraining(${i})">
      <div><div class="lv-name">${lv.name}</div><div class="lv-desc">${lv.desc}</div></div>
      <div class="lv-best">${best === null ? '' : 'שיא ' + best + '%'}</div>
    </button>`;
  }).join('');
  panel.innerHTML = `<h2>${isReadMode() ? 'אימון קריאה' : 'אימון שמיעה'}</h2>
    <p class="sub">בוחרים רמה ומקבלים ${TRAINING_LENGTH} תרגילים. נספרת רק התשובה הראשונה, ובסוף מקבלים דוח.</p>
    <div class="level-list">${items}</div>`;
}

function buildTrainingPlan(level) {
  const cats = trainLevels()[level].cats.map(c => ({
    label: c.label, type: c.type, pool: c.ids ? structsById(c.type, c.ids) : [], inversions: c.inversions || [0], play: c.play || null,
    clef: c.clef || null, acc: c.acc || null, stage: c.stage || null, kind: c.kind || null
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
  training = { level, read: isReadMode(), plan: buildTrainingPlan(level), index: 0, results: [] };
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

// לאוסף ("איפה קשה לי"): מה נשאל, ומה נבחר במקומו בטעות הראשונה (רק כשזו בחירה של סוג, לא היפוך או צליל יסוד)
function itemDetail() {
  const ex = currentExercise;
  if (!ex) return null;
  if (ex.prog && ex.kind === 'prog') {
    const chord = firstWrong && firstWrong.kind === 'chord';
    return { item: chord ? firstWrong.heard : 'מהלך', chose: chord ? firstWrong.label : null };
  }
  const item = ex.struct ? ex.struct.name : noteLabel(ex.correctNote);
  const chose = firstWrong && firstWrong.kind === 'type' && ex.struct ? firstWrong.label : null;
  return { item, chose };
}

// תרגול יומי: תוכנית מהמיומנויות שהמתרגל בחר (נבנית ב-rewards.js), ורצה כמו אימון עם דוח בסוף
function startDailyMix(items) {
  const invs = { chords: [0, 1, 2], septachords: [0, 1, 2, 3] };
  const plan = items.map(it => ({
    label: it.label, type: it.type, display: it.mode === 'read' ? 'both' : 'audio_only',
    pool: it.type === 'note_id' || it.type === 'progressions' ? [] : (it.mode === 'read' ? BASE_STRUCTURES[it.type] : earStructures(it.type)),
    inversions: invs[it.type] || [0], play: null,
    stage: it.type === 'progressions' ? Number(document.getElementById('progStageSelect').value) : null,
    kind: it.type === 'progressions' ? 'prog' : null
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
    clef: ex.clef,
    correct: !firstWrong,
    wrong: firstWrong
  });
  training.index++;
}

function skipExercise() {
  if (!exerciseSolved && window.Rewards) Rewards.broke(currentSkill(), itemDetail());
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
  } else if (isTrainMode()) {
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
  const levels = trainLevels(!!t.read);
  if (!partial && !t.daily) saveHistory({ t: Date.now(), level: t.level, correct, total }, !!t.read);
  if (!partial && !t.daily && window.Rewards) Rewards.trainingDone(t.read ? 'read:' + t.level : t.level, pct);

  const byCat = groupStats(results, r => r.category);
  const byItem = groupStats(results, r => r.item).sort((a, b) => a.correct / a.total - b.correct / b.total);
  const invResults = results.filter(r => r.inversion);
  const byInv = groupStats(invResults, r => r.inversion);
  // בקריאה: איך הלך בכל מפתח, כשהאימון כלל את שניהם
  const byClef = t.read ? groupStats(results.filter(r => CLEF_NAMES[r.clef]), r => CLEF_NAMES[r.clef]) : [];

  const confusions = new Map();
  results.filter(r => !r.correct && r.wrong && (r.wrong.kind === 'type' || r.wrong.kind === 'chord')).forEach(r => {
    const heard = r.wrong.kind === 'chord' ? r.wrong.heard : r.item;
    const k = `${t.read ? 'ראית' : 'שמעת'} ${heard} וענית ${r.wrong.label}`;
    confusions.set(k, (confusions.get(k) || 0) + 1);
  });
  const confList = [...confusions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([k, n]) => `<li>${k}${n > 1 ? ` (${n} פעמים)` : ''}</li>`).join('');

  const strong = byItem.filter(g => g.correct === g.total && g.total >= 2).map(g => g.key);
  const weak = byItem.filter(g => g.correct / g.total < 0.7).map(g => g.key);
  const hasNext = !t.daily && t.level < levels.length - 1;
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
  panel.innerHTML = `<h2>${t.daily ? 'תרגול יומי' : (t.read ? 'קריאה, ' : '') + levels[t.level].name}: ${partial ? 'דוח עד כה' : 'סיכום'}</h2>
    ${total ? `<div class="report-score">${pct}%</div>
    <p class="sub">${correct} נכונות מתוך ${total} בניסיון הראשון</p>` : ''}
    <div class="report-section"><p class="report-advice">${advice}</p></div>
    ${byCat.length > 1 ? `<div class="report-section"><h3>לפי קטגוריה</h3>${byCat.map(statRow).join('')}</div>` : ''}
    ${total ? `<div class="report-section"><h3>לפי סוג</h3>${byItem.map(statRow).join('')}</div>` : ''}
    ${byClef.length > 1 ? `<div class="report-section"><h3>לפי מפתח</h3>${byClef.map(statRow).join('')}</div>` : ''}
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
  if (['read', 'ear', 'train', 'rtrain'].includes(fromUrl)) return fromUrl;
  try {
    const saved = localStorage.getItem('mt_app_mode');
    if (['read', 'ear', 'train', 'rtrain'].includes(saved)) return saved;
  } catch (e) {}
  return 'read';
}
