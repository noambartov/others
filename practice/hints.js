// תרגול: כפתור העזרה.

// ===== עזרה בשלבים: קודם רמז שמקל (השמעה נוחה יותר, היפוך, משפחת האקורד), ורק בסוף התשובה =====
const INTERVAL_NUMBERS = ['פרימה', 'סקונדה', 'טרצה', 'קוורטה', 'קווינטה', 'סקסטה', 'ספטימה', 'אוקטבה'];
const TRIAD_FAMILIES = { '0,4,7': 'מז׳ורי', '0,3,7': 'מינורי', '0,3,6': 'מוקטן', '0,4,8': 'מוגדל' };

function noteLabel(n) {
  return NOTE_NAMES[n.nameIndex].name + (n.acc === 1 ? '♯' : n.acc === -1 ? '♭' : n.acc === 2 ? '𝄪' : n.acc === -2 ? '𝄫' : '');
}

// השמעה מקלה: קודם יחד, ואז צליל אחר צליל מלמטה למעלה ולאט
function playHintVersion() {
  const freqs = currentExercise.notes.map(n => midiToFreq(n.midiNum));
  const ctx = getAudioContext();
  newPlayBus(ctx);
  const now = ctx.currentTime + 0.05;
  freqs.forEach(f => playInstrumentNote(f, now, now + 1.4));
  const start = now + 1.7;
  const lastStart = start + (freqs.length - 1) * 0.55;
  freqs.forEach((f, idx) => playInstrumentNote(f, start + idx * 0.55, lastStart, 0, ending().melodic));
}

// סולם או מודוס: רק עולה, לאט, כל צליל לבד
function playScaleSlow() {
  const freqs = currentExercise.notes.map(n => midiToFreq(n.midiNum));
  const ctx = getAudioContext();
  newPlayBus(ctx);
  const now = ctx.currentTime + 0.05;
  freqs.forEach((f, idx) => {
    const last = idx === freqs.length - 1;
    if (!last) playInstrumentNote(f, now + idx * 0.55, now + (idx + 1) * 0.55);
    else playScaleLastNote(f, now + idx * 0.55, 0.55);
  });
}

// רמז שמצמצם את האפשרויות: keep מחליט אילו מבנים נשארים. אם נשארת אפשרות אחת זו כבר התשובה, אז לא מציעים אותו
function narrowStep(text, keep) {
  const kept = currentExercise.optionsPool.filter(keep);
  if (kept.length <= 1 || kept.length === currentExercise.optionsPool.length) return null;
  return { key: 'narrow', text, keep };
}

function intervalNumberStep(ear) {
  const ex = currentExercise;
  const num = ex.struct.stepOffsets[1];
  if (ear && ex.struct.id === 'A4') {
    return narrowStep('בין קוורטה לקווינטה', o => o.stepOffsets[1] === 3 || o.stepOffsets[1] === 4);
  }
  // בשמיעה הטריטון הוא גם קוורטה מוגדלת, אז הוא נשאר ברמז של קוורטה
  return narrowStep(`זו ${INTERVAL_NUMBERS[num]}${ear ? '' : ' (ספרו קווים ורווחים)'}`,
    o => o.stepOffsets[1] === num || (ear && num === 3 && o.id === 'A4'));
}

function chordFamilyStep() {
  const ex = currentExercise;
  if (typeAnsweredCorrectly) return null;
  if (ex.type === 'chords') {
    const third = ex.struct.semitones[1];
    return narrowStep(`הטרצה מעל השורש ${third === 4 ? 'גדולה' : 'קטנה'}`, o => o.semitones[1] === third);
  }
  const triad = ex.struct.semitones.slice(0, 3).join(',');
  return narrowStep(`המשולש שבבסיס ${TRIAD_FAMILIES[triad]}`, o => o.semitones.slice(0, 3).join(',') === triad);
}

function inversionStep() {
  const ex = currentExercise;
  if (inversionIrrelevant(ex.type, ex.struct) || ex.inversionsPool.length < 2 || selectedChordInv === ex.inversion) return null;
  return { key: 'inv', text: `היפוך: ${INVERSIONS_DATA[ex.type].find(i => i.id === ex.inversion).name}`, keepInv: ex.inversion };
}

function scaleFamilyStep() {
  const ex = currentExercise;
  if (ex.type === 'scales') {
    const minor = ex.struct.semitones[2] === 3;
    return narrowStep(minor ? 'זה אחד מסוגי המינור' : 'הטרצה גדולה', o => (o.semitones[2] === 3) === minor);
  }
  const sig = st => st.semitones[4] === 6 ? 'dim' : st.semitones[2] === 4 ? 'maj' : 'min';
  const fam = sig(ex.struct);
  const text = { maj: 'מודוס מז׳ורי (טרצה גדולה)', min: 'מודוס מינורי (טרצה קטנה)', dim: 'קווינטה מוקטנת מעל הטוניקה' }[fam];
  return narrowStep(text, o => sig(o) === fam);
}

// סימני מפתח: איך מוצאים את המז׳ור, ואז את המינור המקביל
const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6];
const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];

function keySigHintSteps(key) {
  const name = (letter, acc) => noteLabel({ nameIndex: letter, acc });
  let first;
  if (key.accCount === 0) first = 'בלי סימנים במפתח: דו מז׳ור';
  else if (key.accType === 1) first = `הדיאז האחרון (${name(SHARP_ORDER[key.accCount - 1], 1)}) הוא הצליל השביעי של המז׳ור. חצי טון מעליו: צליל היסוד`;
  else if (key.accCount === 1) first = 'במול אחד: פה מז׳ור';
  else first = `הבמול הלפני אחרון (${name(FLAT_ORDER[key.accCount - 2], -1)}) הוא צליל היסוד של המז׳ור`;
  return [
    { key: 'sig', text: first },
    { key: 'rel', text: 'המינור המקביל: טרצה קטנה מתחת לצליל היסוד של המז׳ור' }
  ];
}

const CLEF_HINTS = {
  sol: 'מפתח סול מסמן את סול על הקו השני מלמטה',
  fa: 'מפתח פה מסמן את פה על הקו הרביעי מלמטה, בין שתי הנקודות',
  alto: 'מפתח אלט מסמן את דו האמצעי על הקו האמצעי, במרכז המפתח'
};

function buildHintSteps() {
  const ex = currentExercise;
  if (ex.keySig) return keySigHintSteps(ex.keySig);
  const ear = document.getElementById('displayMode').value === 'audio_only';
  let steps = [];
  if (ex.type === 'note_id') {
    steps = [{ key: 'clef', text: CLEF_HINTS[ex.clef] || CLEF_HINTS.sol }];
  } else if (ex.type === 'intervals') {
    if (ear) steps.push({ key: 'play', text: 'מעכשיו ההשמעה: יחד, ואז צליל אחר צליל מלמטה למעלה', play: playHintVersion });
    steps.push(intervalNumberStep(ear));
  } else if (ex.type === 'chords' || ex.type === 'septachords') {
    if (ear) steps.push({ key: 'play', text: 'מעכשיו ההשמעה: יחד, ואז צליל אחר צליל מלמטה למעלה', play: playHintVersion });
    else steps.push({ key: 'root', text: `השורש: ${noteLabel(ex.notes[(ex.notes.length - ex.inversion) % ex.notes.length])}` });
    steps.push(inversionStep(), chordFamilyStep());
  } else {
    if (ear) steps.push({ key: 'play', text: 'מעכשיו ההשמעה: רק עולה, לאט', play: playScaleSlow });
    steps.push(scaleFamilyStep());
  }
  return steps.filter(Boolean);
}

function applyHint(step) {
  if (step.play) {
    currentExercise.hintPlay = step.play;
    step.play();
  }
  if (step.keep) {
    document.querySelectorAll('#optionsButtons .opt-btn, #chordTypeButtons .opt-btn, #modeTypeButtons .opt-btn').forEach(btn => {
      const opt = currentExercise.optionsPool.find(o => o.name === btn.dataset.name);
      if (opt && !step.keep(opt)) btn.classList.add('hint-out');
    });
  }
  if (step.keepInv !== undefined) {
    document.querySelectorAll('#chordInvButtons .opt-btn').forEach(btn => {
      if (Number(btn.dataset.inv) !== step.keepInv) btn.classList.add('hint-out');
    });
  }
}

function showHelp() {
  if (!currentExercise) return;
  // באימון לפי שלבים נספרת רק תשובה ראשונה בלי עזרה
  if (training && !exerciseSolved) noteWrong('עזרה', 'help');
  if (!exerciseSolved) helpUsed = true;
  // הרמזים נבנים מחדש בכל לחיצה, כדי לדלג על חלק שהתלמיד כבר ענה עליו נכון
  const steps = buildHintSteps().filter(st => !shownHints.has(st.key));
  const btn = document.getElementById('helpBtn');
  if (steps.length) {
    const step = steps[0];
    applyHint(step);
    const popover = document.getElementById('helpPopover');
    popover.innerText = step.text;
    popover.classList.add('visible');
    shownHints.add(step.key);
    btn.innerText = steps.length > 1 ? 'רמז נוסף' : 'תשובה';
    return;
  }
  revealAnswer();
  btn.innerText = 'עזרה';
}

function revealAnswer() {
  if (!currentExercise) return;
  const popover = document.getElementById('helpPopover');
  let text = '';

  if (currentExercise.type === 'note_id') {
    const n = currentExercise.correctNote;
    let name = NOTE_NAMES[n.nameIndex].eng + ' / ' + NOTE_NAMES[n.nameIndex].name;
    let accStr = n.acc === 1 ? ' דיאז' : (n.acc === -1 ? ' במול' : '');
    text = `${name}${accStr}`;
  } else if (currentExercise.keySig) {
    text = currentExercise.keySig.name;
  } else if (currentExercise.type === 'modes' || currentExercise.type === 'scales') {
    const rootNote = currentExercise.notes[0];
    const rootStr = NOTE_NAMES[rootNote.nameIndex].name + (rootNote.acc === 1 ? '♯' : (rootNote.acc === -1 ? '♭' : ''));
    text = `${rootStr} ${currentExercise.struct.name}`;
  } else if (currentExercise.type === 'chords' || currentExercise.type === 'septachords') {
    const invName = INVERSIONS_DATA[currentExercise.type].find(i => i.id === currentExercise.inversion).name;
    text = currentExercise.inversionsPool.length < 2 ? getStructureLabel(currentExercise.struct) : `${getStructureLabel(currentExercise.struct)} (${invName})`;
  } else {
    text = `${getStructureLabel(currentExercise.struct)}`;
  }

  popover.innerText = text;
  popover.classList.add('visible');
}
