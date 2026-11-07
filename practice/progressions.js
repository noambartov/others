// תרגול: מהלכים הרמוניים בשמיעה. התרגיל עצמו (מהלך, סימון והובלת קולות) נבנה ב-harmony-core.js.
// שני סוגי שאלות: "מה המהלך?" (כותבים את כל האקורדים ואז בודקים; האקורד הראשון הוא הרמז הראשון בעזרה) ו"איך זה נגמר?" (סוג הקדנצה).

const HC = window.HarmonyCore;
let progIndex = 1;

function progSetting(id, fallback) {
  const el = document.getElementById(id);
  return el ? el.value : fallback;
}

// cfg באימון: { stage, kind }. בתרגול חופשי: מההגדרות (עד שלב, סולם, סוג שאלה)
function progressionExercise(cfg) {
  const stage = cfg && cfg.stage ? cfg.stage : Number(progSetting('progStageSelect', '4'));
  const mode = cfg ? 'both' : progSetting('progModeSelect', 'both');
  let kind = cfg && cfg.kind ? cfg.kind : progSetting('progAskSelect', 'prog');
  if (kind === 'both') kind = stage >= HC.CADENCE_FROM && Math.random() < 0.35 ? 'cad' : 'prog';
  if (kind === 'cad' && stage < HC.CADENCE_FROM) kind = 'prog';
  const flags = HC.flagsFor(stage);
  const prog = HC.generate({ flags, mode, kind });
  return {
    type: 'progressions', kind, stage, flags, prog,
    struct: { name: kind === 'cad' ? HC.CADENCES[prog.ending] : 'מהלך' },
    notes: [], inversion: 0, optionsPool: [], inversionsPool: [],
    category: cfg ? cfg.label : null
  };
}

function progressionKey(ex) {
  return 'prog:' + ex.kind + ':' + ex.prog.tonic + ':' + ex.prog.tokens.join(',');
}

// ===== השמעה =====
// slow: לאט יותר. bassFirst: קודם קו הבס לבד, ואז המהלך
function playProgression(opts = {}) {
  const ex = currentExercise;
  if (!ex || !ex.prog) return;
  const voices = ex.prog.voices;
  const ctx = getAudioContext();
  newPlayBus(ctx);
  const dur = opts.slow ? 1.6 : 1.05;
  let t = ctx.currentTime + 0.05;
  if (opts.bassFirst) {
    const step = dur * 0.8;
    voices.forEach((v, i) => playInstrumentNote(midiToFreq(v[0]), t + i * step, t + (i + 1) * step - 0.02, 0.1));
    t += voices.length * step + 0.9;
  }
  playChords(voices, t, dur);
}

function playChords(voices, t, dur) {
  voices.forEach((v, i) => {
    const last = i === voices.length - 1;
    v.forEach(m => {
      const f = midiToFreq(m);
      if (last) playInstrumentNote(f, t + i * dur, t + i * dur, 0, ending().harmonic);
      else playInstrumentNote(f, t + i * dur, t + (i + 1) * dur - 0.02, 0.1);
    });
  });
}

// ===== תשובות =====
function setupProgressionUI() {
  const ex = currentExercise;
  const slots = document.getElementById('progSlots');
  const sub = document.getElementById('progSub');
  const q = document.getElementById('progQuestion');
  const grid = document.getElementById('progButtons');
  slots.innerHTML = '';
  grid.innerHTML = '';
  progIndex = 1;

  if (ex.kind === 'cad') {
    slots.style.display = 'none';
    sub.style.display = 'none';
    q.style.display = '';
    HC.cadenceOptions(ex.flags).forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'opt-btn';
      btn.dataset.name = c.name;
      btn.textContent = c.name;
      btn.onclick = () => checkCadence(c.id, btn);
      grid.appendChild(btn);
    });
    return;
  }

  slots.style.display = '';
  sub.style.display = '';
  q.style.display = 'none';
  const n = ex.prog.chords.length;
  progAnswers = ex.prog.tokens.map(() => null);
  progLocked = new Set();
  progChecked = false;
  ex.prog.chords.forEach((c, i) => {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'prog-slot';
    s.onclick = () => selectProgSlot(i);
    slots.appendChild(s);
  });
  HC.vocabulary(ex.flags, ex.prog.mode).forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn prog-btn';
    btn.dataset.token = v.token;
    btn.dataset.family = v.family;
    btn.innerHTML = v.html;
    btn.onclick = () => writeProgChord(v);
    grid.appendChild(btn);
  });
  progIndex = 0;
  markProgSlots();
}

// התשובה נכתבת כולה ורק אז נבדקת, כמו בהכתבת הקצב: כך חושבים על המהלך לפני שעונים, ואי אפשר לנחש אקורד אחרי אקורד.
// progAnswers: מה שנכתב בכל משבצת. progLocked: משבצות שכבר נבדקו ונמצאו נכונות (והראשונה, שניתנת)
let progAnswers = [];
let progLocked = new Set();
let progChecked = false;

function nextOpenSlot(from) {
  const n = progAnswers.length;
  for (let k = 0; k < n; k++) {
    const i = (from + k) % n;
    if (!progLocked.has(i) && !progAnswers[i]) return i;
  }
  return -1;
}

function selectProgSlot(i) {
  if (exerciseSolved || progLocked.has(i)) return;
  progIndex = i;
  markProgSlots();
}

function writeProgChord(v) {
  if (exerciseSolved || progIndex < 0) return;
  const ex = currentExercise;
  const i = progIndex;
  progAnswers[i] = v.token;
  const slot = document.querySelectorAll('#progSlots .prog-slot')[i];
  slot.innerHTML = v.html;
  slot.classList.remove('wrong');
  document.querySelectorAll('#progButtons .hint-out').forEach(b => b.classList.remove('hint-out'));
  progIndex = nextOpenSlot(i + 1);
  markProgSlots();
}

function markProgSlots() {
  const ex = currentExercise;
  const n = ex.prog.chords.length;
  document.querySelectorAll('#progSlots .prog-slot').forEach((s, i) => {
    s.classList.toggle('active', i === progIndex);
    s.classList.toggle('empty', !progAnswers[i] && i !== progIndex);
    s.classList.toggle('locked', progLocked.has(i));
  });
  const sub = document.getElementById('progSub');
  sub.innerHTML = '';
  if (progAnswers.every(Boolean)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'prog-check';
    btn.textContent = 'בדיקה';
    btn.onclick = checkProgression;
    sub.appendChild(btn);
  } else if (progIndex >= 0) {
    sub.textContent = `אקורד ${progIndex + 1} מתוך ${n}`;
  }
}

function checkProgression() {
  if (exerciseSolved) return;
  const ex = currentExercise;
  const tokens = ex.prog.tokens;
  const wrong = [];
  const slots = document.querySelectorAll('#progSlots .prog-slot');
  tokens.forEach((t, i) => {
    if (progAnswers[i] === t) progLocked.add(i);
    else wrong.push(i);
  });
  const fb = document.getElementById('feedback');
  if (!wrong.length) {
    progIndex = -1;
    markProgSlots();
    currentScore += 1;
    updateTopbarProgress();
    fb.textContent = 'נכון';
    fb.className = 'feedback success';
    triggerSuccessAndNext();
    return;
  }
  // באימון נספרת רק הבדיקה הראשונה. לדוח: מה נשמע ומה נכתב במקומו, באקורד השגוי הראשון
  const label = t => HC.label(t, ex.prog.mode).text;
  const first = wrong[0];
  noteWrong(label(progAnswers[first]), 'chord');
  if (firstWrong && firstWrong.kind === 'chord' && !firstWrong.heard) firstWrong.heard = label(tokens[first]);
  const mine = progAnswers.slice();
  wrong.forEach(i => { slots[i].classList.add('wrong'); progAnswers[i] = null; });
  progChecked = true;
  progIndex = first;
  markProgSlots();
  fb.className = 'feedback error';
  fb.textContent = wrong.length === 1 ? 'אקורד אחד לא נכון. מתקנים את המסומן' : `${wrong.length} אקורדים לא נכונים. מתקנים את המסומנים`;
  // לשמוע את המהלך כפי שנכתב, כדי להשוות למה שהושמע
  const hear = document.createElement('button');
  hear.type = 'button';
  hear.className = 'hear-choice';
  hear.textContent = 'לשמוע מה שכתבתי';
  hear.onclick = () => {
    const { voices } = HC.voice(mine.map(t => HC.chordInfo(t, ex.prog.mode)), ex.prog.tonic);
    const ctx = getAudioContext();
    newPlayBus(ctx);
    playChords(voices, ctx.currentTime + 0.05, 1.05);
  };
  fb.append(hear);
}

function checkCadence(id, btn) {
  if (exerciseSolved) return;
  clearWrongButtons();
  const ex = currentExercise;
  if (id === ex.prog.ending) {
    btn.classList.add('correct');
    currentScore += 1;
    updateTopbarProgress();
    document.getElementById('feedback').textContent = 'נכון';
    document.getElementById('feedback').className = 'feedback success';
    triggerSuccessAndNext();
    return;
  }
  btn.classList.add('wrong');
  noteWrong(HC.CADENCES[id]);
  document.getElementById('feedback').textContent = 'נסה שוב';
  document.getElementById('feedback').className = 'feedback error';
}

// ===== עזרה =====
const CADENCE_HINTS = {
  auth: 'הסוף: מהדומיננטה חזרה לטוניקה',
  half: 'הסוף נעצר על הדומיננטה, כמו שאלה פתוחה',
  plag: 'הסוף: מ־IV לטוניקה, בלי דומיננטה',
  dec: 'הדומיננטה לא חוזרת לטוניקה אלא ל־VI'
};

function progressionHintSteps() {
  const ex = currentExercise;
  const steps = [];
  // הרמז הראשון: האקורד הראשון, כדי לדעת מאיפה מתחילים
  if (ex.kind !== 'cad' && !progLocked.has(0)) {
    steps.push({ key: 'first', text: `האקורד הראשון: ${ex.prog.chords[0].text}`, progFirst: true });
  }
  steps.push(
    { key: 'play', text: 'מעכשיו ההשמעה לאט יותר', play: () => playProgression({ slow: true }) },
    { key: 'bass', text: 'מעכשיו ההשמעה: קודם קו הבס לבד, ואז המהלך', play: () => playProgression({ slow: true, bassFirst: true }) }
  );
  if (ex.kind === 'cad') {
    steps.push({ key: 'cad', text: CADENCE_HINTS[ex.prog.ending] });
    return steps;
  }
  const right = progIndex >= 0 ? ex.prog.chords[progIndex] : null;
  if (right) {
    const fam = right.family;
    const buttons = document.querySelectorAll('#progButtons .opt-btn');
    const kept = Array.from(buttons).filter(b => b.dataset.family === fam).length;
    if (kept > 1 && kept < buttons.length) {
      steps.push({ key: 'fam' + progIndex, text: `האקורד הבא ממשפחת ה${HC.FAMILY_NAMES[fam]}`, progFamily: fam });
    }
  }
  return steps;
}

function applyProgressionHint(step) {
  if (step.progFirst) {
    const ex = currentExercise;
    const slot = document.querySelectorAll('#progSlots .prog-slot')[0];
    progAnswers[0] = ex.prog.tokens[0];
    progLocked.add(0);
    slot.innerHTML = ex.prog.chords[0].html;
    slot.classList.remove('wrong');
    slot.classList.add('given');
    if (progIndex === 0 || progIndex < 0) progIndex = nextOpenSlot(1);
    markProgSlots();
    return;
  }
  if (!step.progFamily) return;
  document.querySelectorAll('#progButtons .opt-btn').forEach(b => {
    if (b.dataset.family !== step.progFamily) b.classList.add('hint-out');
  });
}

function progressionAnswerHtml() {
  const ex = currentExercise;
  if (ex.kind === 'cad') return HC.CADENCES[ex.prog.ending];
  return '<span dir="ltr">' + ex.prog.chords.map(c => c.text).join(' – ') + '</span>';
}
