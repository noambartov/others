// תרגול: מהלכים הרמוניים בשמיעה. התרגיל עצמו (מהלך, סימון והובלת קולות) נבנה ב-harmony-core.js.
// שני סוגי שאלות: "מה המהלך?" (מסמנים אקורד אחרי אקורד, הראשון כבר מסומן) ו"איך זה נגמר?" (סוג הקדנצה).

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
  ex.prog.chords.forEach((c, i) => {
    const s = document.createElement('div');
    s.className = 'prog-slot' + (i === 0 ? ' given' : '');
    if (i === 0) s.innerHTML = c.html;
    slots.appendChild(s);
  });
  HC.vocabulary(ex.flags, ex.prog.mode).forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn prog-btn';
    btn.dataset.token = v.token;
    btn.dataset.family = v.family;
    btn.innerHTML = v.html;
    btn.onclick = () => checkProgChord(v, btn);
    grid.appendChild(btn);
  });
  markProgSlots();
}

function markProgSlots() {
  const ex = currentExercise;
  document.querySelectorAll('#progSlots .prog-slot').forEach((s, i) => {
    s.classList.toggle('active', i === progIndex);
    s.classList.toggle('empty', i > progIndex);
  });
  const n = ex.prog.chords.length;
  document.getElementById('progSub').textContent = progIndex < n ? `אקורד ${progIndex + 1} מתוך ${n}` : '';
}

function checkProgChord(v, btn) {
  if (exerciseSolved) return;
  clearWrongButtons();
  const ex = currentExercise;
  const right = ex.prog.chords[progIndex];
  if (v.token === right.token) {
    const slot = document.querySelectorAll('#progSlots .prog-slot')[progIndex];
    slot.innerHTML = right.html;
    progIndex++;
    document.querySelectorAll('#progButtons .hint-out').forEach(b => b.classList.remove('hint-out'));
    document.getElementById('feedback').textContent = '';
    document.getElementById('feedback').className = 'feedback';
    markProgSlots();
    if (progIndex >= ex.prog.chords.length) {
      currentScore += 1;
      updateTopbarProgress();
      document.getElementById('feedback').textContent = 'נכון';
      document.getElementById('feedback').className = 'feedback success';
      triggerSuccessAndNext();
    }
    return;
  }
  btn.classList.add('wrong');
  noteWrong(v.text, 'chord');
  if (firstWrong && firstWrong.kind === 'chord' && !firstWrong.heard) firstWrong.heard = right.text;
  const fb = document.getElementById('feedback');
  fb.className = 'feedback error';
  fb.textContent = 'נסה שוב';
  // לשמוע את האקורד הקודם ואחריו את מה שנבחר, כדי להשוות
  const prev = ex.prog.chords[progIndex - 1];
  const chosen = HC.voiceAfter(prev.voices, prev.token, v.token, ex.prog.mode, ex.prog.tonic);
  const hear = document.createElement('button');
  hear.type = 'button';
  hear.className = 'hear-choice';
  hear.textContent = 'לשמוע מה שבחרתי';
  hear.onclick = () => {
    const ctx = getAudioContext();
    newPlayBus(ctx);
    playChords([prev.voices, chosen], ctx.currentTime + 0.05, 1.05);
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
  const steps = [
    { key: 'play', text: 'מעכשיו ההשמעה לאט יותר', play: () => playProgression({ slow: true }) },
    { key: 'bass', text: 'מעכשיו ההשמעה: קודם קו הבס לבד, ואז המהלך', play: () => playProgression({ slow: true, bassFirst: true }) }
  ];
  if (ex.kind === 'cad') {
    steps.push({ key: 'cad', text: CADENCE_HINTS[ex.prog.ending] });
    return steps;
  }
  const right = ex.prog.chords[progIndex];
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
