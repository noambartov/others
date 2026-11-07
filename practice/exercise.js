// תרגול: יצירת תרגיל, מעבר לתרגיל הבא, וכפתורי התשובה ובדיקתן לכל סוג תרגיל.

function getNoteDetails(absLine, acc, clef) {
  return T.note(absLine, acc, clef);
}

function buildNotes(baseLine, baseAcc, struct, clef, inversionShift = 0) {
  const shared = { steps: struct.stepOffsets, semitones: struct.semitones };
  return T.build(shared, { line: baseLine, acc: baseAcc, clef, inversion: inversionShift, given: 'root' }).notes;
}

const AUDIO_RANGE = { low: 45, high: 81 }; // A2..A5
const AUDIO_CHORD_LOW = 48; // אקורדים לא יורדים מתחת לדו שמתחת לדו האמצעי (C3)
const AUDIO_RANGE_TYPES = ['intervals', 'chords', 'septachords'];

// cfg: באימון, הקטגוריה שנבחרה מהרמה (סוג, מאגר מבנים, היפוכים, אופן נגינה) במקום ההגדרות
function generateExercise(cfg = null) {
  const type = cfg ? cfg.type : document.getElementById('exType').value;
  if (type === 'progressions') return progressionExercise(cfg);
  let clefSelectVal = cfg && cfg.clef ? cfg.clef : document.getElementById('clefSelect').value;
  let clef = clefSelectVal === 'rand' ? (Math.random() < 0.5 ? 'sol' : 'fa') : clefSelectVal;
  // סולמות ומודוסים במושמע בלבד: רק מפתח סול, עד שני קווי עזר מעל החמשה (דו6)
  const audioScale = document.getElementById('displayMode').value === 'audio_only' && (type === 'scales' || type === 'modes');
  if (audioScale) clef = 'sol';

  if (type === 'note_id') {
    const accOption = cfg && cfg.acc ? cfg.acc : document.getElementById('accidentalSelect').value;
    let acc = 0;
    if (accOption === 'with') {
      acc = Math.random() < 0.4 ? (Math.random() < 0.5 ? -1 : 1) : 0;
    }
    let line = Math.floor(Math.random() * 9) - 2;
    let note = getNoteDetails(line, acc, clef);

    if (note.absLine < -4 || note.absLine > 12) return generateExercise(cfg);

    return { type, clef, notes: [note], correctNote: note, category: cfg ? cfg.label : null };
  }

  if (type === 'scales' && !cfg && keySigMode()) return keySigExercise(clef);

  const activeOptionPills = cfg ? cfg.pool.map(st => st.name) : Array.from(document.querySelectorAll('#optionsTags .tag-pill.active')).map(el => el.dataset.value);
  if (activeOptionPills.length === 0) {
    alert("יש לבחור לפחות אפשרות אחת לתרגול!");
    return null;
  }

  let activeInvPills = [0];
  if (cfg) {
    activeInvPills = cfg.inversions || [0];
  } else if (type === 'chords' || type === 'septachords') {
    activeInvPills = Array.from(document.querySelectorAll('#inversionsTags .tag-pill.active')).map(el => parseInt(el.dataset.value));
    if (activeInvPills.length === 0) {
      alert("יש לבחור לפחות היפוך אחד לתרגול!");
      return null;
    }
  }

  const poolStructs = cfg ? cfg.pool : optionStructures(type).filter(s => activeOptionPills.includes(s.name));
  const chosenStruct = poolStructs[Math.floor(Math.random() * poolStructs.length)];
  let chosenInversion = activeInvPills[Math.floor(Math.random() * activeInvPills.length)];
  // למשולש מוגדל אין משמעות להיפוך: תמיד במצב יסודי, ושאלת ההיפוך נופלת
  if (inversionIrrelevant(type, chosenStruct)) chosenInversion = 0;

  // במושמע בלבד מרווחים ואקורדים נשארים ברגיסטר נעים: מלה בחלל התחתון של מפתח פה (A2) ועד לה מעל מפתח סול (A5)
  const audioRange = document.getElementById('displayMode').value === 'audio_only' && AUDIO_RANGE_TYPES.includes(type);
  let baseLine = (clef === 'sol') ? Math.floor(Math.random() * 3) - 2 : Math.floor(Math.random() * 3) - 1;
  if (audioRange) baseLine = Math.floor(Math.random() * 15) - 4;
  let baseAcc = Math.random() < 0.25 ? (Math.random() < 0.5 ? -1 : 1) : 0;
  let notes = buildNotes(baseLine, baseAcc, chosenStruct, clef, chosenInversion);

  let isValid = notes.every(n => Math.abs(n.acc) <= 2 && n.absLine >= -4 && n.absLine <= 14);
  if (audioRange) {
    const low = type === 'intervals' ? AUDIO_RANGE.low : AUDIO_CHORD_LOW;
    isValid = isValid && notes.every(n => n.midiNum >= low && n.midiNum <= AUDIO_RANGE.high);
  }
  if (audioScale) isValid = isValid && notes.every(n => n.absLine <= 12);
  if (!isValid) {
    return generateExercise(cfg);
  }

  const hasDoubleAccidental = notes.some(n => Math.abs(n.acc) >= 2);
  if (hasDoubleAccidental) {
    const isAllowedScale = (type === 'scales') && (chosenStruct.name === 'מינור הרמוני' || chosenStruct.name === 'מינור מלודי');
    if (!isAllowedScale) {
      return generateExercise(cfg);
    }
  }

  return {
    type,
    struct: chosenStruct,
    clef,
    notes,
    inversion: chosenInversion,
    baseLine,
    baseAcc,
    optionsPool: poolStructs,
    inversionsPool: INVERSIONS_DATA[type] ? INVERSIONS_DATA[type].filter(i => activeInvPills.includes(i.id)) : [],
    playMode: cfg ? cfg.play : null,
    category: cfg ? cfg.label : null
  };
}

// רק סימני מפתח: התשובה היא המז׳ור או המינור המקביל, ושתיהן נכונות
function keySigExercise(clef) {
  const key = T.KEYS[Math.floor(Math.random() * T.KEYS.length)];
  const pool = ['major', 'minor_natural'].map(id => BASE_STRUCTURES.scales.find(s => s.id === id));
  pool[1] = Object.assign({}, pool[1], { name: 'מינור' });
  const answers = [
    { nameIndex: key.major[0], acc: key.major[1], struct: pool[0] },
    { nameIndex: key.minor[0], acc: key.minor[1], struct: pool[1] }
  ];
  return {
    type: 'scales', keySig: key, clef, notes: [], answers,
    struct: pool[0], inversion: 0, optionsPool: pool, inversionsPool: [], playMode: null, category: null
  };
}

function triggerSuccessAndNext() {
  exerciseSolved = true;
  if (training) recordTrainingResult();
  const unlocked = window.Rewards ? Rewards.solved(!firstWrong && !helpUsed, currentSkill(), itemDetail()) : [];
  // בלי השמעה חוזרת: הצליל דועך, רגע של שקט, ואז התרגיל הבא
  silenceAll(0.5);
  if (unlocked.length) {
    // שיר חדש באוסף: מנגנים אותו, והתרגיל הבא מגיע אחרי "המשך"
    setTimeout(() => Rewards.showUnlock(unlocked, goToNextExercise), 900);
    return;
  }
  const isAudio = document.getElementById('displayMode').value === 'audio_only';
  setTimeout(goToNextExercise, isAudio ? 1500 : 1000);
}

function goToNextExercise() {
  if (training && training.index >= training.plan.length) {
    showTrainingReport();
    return;
  }
  startPractice();
  if (document.getElementById('displayMode').value !== 'audio_only') return;
  // אם התרגיל הקודם עוד מצלצל (למשל "תרגיל חדש" באמצע), משתיקים ומשאירים רגע שקט לפני ההשמעה
  if (silenceAll(0.3)) setTimeout(playCurrentExercise, 900);
  else playCurrentExercise();
}

function exerciseKey(ex) {
  if (ex.prog) return progressionKey(ex);
  if (ex.keySig) return ex.clef + ':sig:' + ex.keySig.name;
  return ex.clef + ':' + (ex.struct ? ex.struct.name : '') + ':' + ex.inversion + ':' + ex.notes.map(n => n.absLine + '/' + n.acc).join(',');
}

function startPractice() {
  // לא חוזרים על אותו תרגיל פעמיים ברצף, כדי שיהיה ברור שהתחלף
  const prevKey = currentExercise ? exerciseKey(currentExercise) : null;
  const cfg = training ? training.plan[training.index] : null;
  // בתרגול היומי כל תרגיל קובע לעצמו אם הוא בקריאה (חמשה) או בשמיעה
  if (cfg && cfg.display) document.getElementById('displayMode').value = cfg.display;
  let next = generateExercise(cfg);
  for (let i = 0; next && prevKey && exerciseKey(next) === prevKey && i < 20; i++) next = generateExercise(cfg);
  currentExercise = next;
  if (!currentExercise) return;

  document.getElementById('practiceArea').style.display = 'flex';
  document.getElementById('feedback').innerText = '';
  document.getElementById('feedback').className = 'feedback';

  const popover = document.getElementById('helpPopover');
  popover.classList.remove('visible');
  popover.innerText = '';
  shownHints = new Set();
  document.getElementById('helpBtn').innerText = 'עזרה';

  selectedAccidental = '0';
  selectedChordType = null;
  selectedChordInv = null;
  selectedNoteNameIdx = null;
  pendingLetter = null;
  selectedModeType = null;
  typeAnsweredCorrectly = false;
  exerciseSolved = false;
  firstWrong = null;
  helpUsed = false;
  currentPlayDirection = 'ascending';
  updateTopbarProgress();

  renderStaff(currentExercise);
  setupAnswerUI();
  updateFirstNoteButtonUI();
}

function setupAnswerUI() {
  const stdArea = document.getElementById('standardAnswersArea');
  const chordArea = document.getElementById('chordAnswersArea');
  const modeArea = document.getElementById('modeAnswersArea');
  const noteArea = document.getElementById('noteIdAnswersArea');
  const progArea = document.getElementById('progAnswersArea');

  progArea.style.display = 'none';
  document.body.classList.toggle('ex-prog', currentExercise.type === 'progressions');
  stdArea.style.display = 'none';
  chordArea.style.display = 'none';
  modeArea.style.display = 'none';
  noteArea.style.display = 'none';

  if (currentExercise.type === 'progressions') {
    progArea.style.display = 'flex';
    setupProgressionUI();
  } else if (currentExercise.type === 'chords' || currentExercise.type === 'septachords') {
    chordArea.style.display = 'flex';
    setupChordUI();
  } else if (currentExercise.type === 'modes' || currentExercise.type === 'scales') {
    modeArea.style.display = 'flex';
    setupModeUI();
  } else if (currentExercise.type === 'note_id') {
    noteArea.style.display = 'block';
    setupNoteIdUI();
  } else {
    stdArea.style.display = 'block';
    setupStandardUI();
  }
}

function setupStandardUI() {
  const container = document.getElementById('optionsButtons');
  container.innerHTML = '';
  currentExercise.optionsPool.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.dataset.name = opt.name;
    btn.innerText = getStructureLabel(opt);
    btn.onclick = () => {
      if (exerciseSolved) return;
      clearWrongButtons();
      if (opt.name === currentExercise.struct.name) {
        btn.classList.add('correct');
        currentScore += 1;
        updateTopbarProgress();
        document.getElementById('feedback').innerText = 'נכון';
        document.getElementById('feedback').className = 'feedback success';
        triggerSuccessAndNext();
      } else {
        btn.classList.add('wrong');
        noteWrong(opt.name);
        showWrongFeedback('נסה שוב', opt, currentExercise.inversion);
      }
    };
    container.appendChild(btn);
  });
}

// טעות בשמיעה: אפשר לשמוע את מה שנבחר, מאותו צליל יסוד ובאותה דרך נגינה, ולהשוות למה שהושמע.
// התשובה הנכונה לא נחשפת, כך שממשיכים לנסות כרגיל
function showWrongFeedback(text, struct, inversion) {
  const fb = document.getElementById('feedback');
  fb.className = 'feedback error';
  fb.textContent = text;
  const ex = currentExercise;
  if (!struct || ex.baseLine === undefined || document.getElementById('displayMode').value !== 'audio_only') return;
  const notes = buildNotes(ex.baseLine, ex.baseAcc, struct, ex.clef, inversion);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'hear-choice';
  btn.textContent = 'לשמוע מה שבחרתי';
  btn.onclick = () => playExerciseNotes(notes);
  fb.append(btn);
}

function setupChordUI() {
  const typeContainer = document.getElementById('chordTypeButtons');
  const invContainer = document.getElementById('chordInvButtons');
  typeContainer.innerHTML = '';
  invContainer.innerHTML = '';

  currentExercise.optionsPool.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.dataset.name = opt.name;
    btn.innerText = getStructureLabel(opt);
    btn.onclick = () => checkChordType(opt.name, btn);
    typeContainer.appendChild(btn);
  });

  currentExercise.inversionsPool.forEach(inv => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.dataset.inv = inv.id;
    btn.innerText = inv.name;
    btn.onclick = () => checkChordInv(inv.id, btn);
    invContainer.appendChild(btn);
  });

  // כשיש רק היפוך אחד אפשרי (למשל רק מצב יסודי) אין מה לבחור: השאלה על ההיפוך לא מוצגת
  const singleInv = currentExercise.inversionsPool.length < 2;
  if (singleInv) selectedChordInv = currentExercise.inversion;
  document.getElementById('chordInvTitle').style.display = singleInv ? 'none' : '';
  invContainer.style.display = singleInv ? 'none' : '';
  document.getElementById('chordTypeTitle').innerText = singleInv ? 'בחירת הטיפוס:' : '1. בחירת הטיפוס:';
}

function inversionIrrelevant(type, struct) {
  if (type === 'chords' && struct.id === 'augmented') return true;
  // ספטאקורד מוקטן נשמע זהה בכל ההיפוכים, אז בשמיעה לא שואלים עליו
  return type === 'septachords' && struct.id === 'diminished7' && document.getElementById('displayMode').value === 'audio_only';
}

function checkChordType(typeName, btn) {
  if (exerciseSolved) return;
  clearWrongButtons();
  if (selectedChordType === typeName) return;
  
  if (typeName === currentExercise.struct.name) {
    btn.classList.add('correct');
    selectedChordType = typeName;
    if (!typeAnsweredCorrectly) {
      currentScore += 0.5;
      typeAnsweredCorrectly = true;
      updateTopbarProgress();
    }
    document.getElementById('feedback').innerText = 'טיפוס נכון';
    document.getElementById('feedback').className = 'feedback success';
    if (inversionIrrelevant(currentExercise.type, currentExercise.struct)) selectedChordInv = currentExercise.inversion;
    checkChordComplete();
  } else {
    btn.classList.add('wrong');
    noteWrong(typeName);
    showWrongFeedback('טיפוס שגוי', currentExercise.optionsPool.find(o => o.name === typeName), currentExercise.inversion);
  }
}

function checkChordInv(invId, btn) {
  if (exerciseSolved) return;
  clearWrongButtons();
  if (invId === currentExercise.inversion) {
    btn.classList.add('correct');
    selectedChordInv = invId;
    document.getElementById('feedback').innerText = 'היפוך נכון';
    document.getElementById('feedback').className = 'feedback success';
    checkChordComplete();
  } else {
    btn.classList.add('wrong');
    noteWrong(INVERSIONS_DATA[currentExercise.type].find(i => i.id === invId).name, 'inv');
    showWrongFeedback('היפוך שגוי', currentExercise.struct, invId);
  }
}

function checkChordComplete() {
  if (selectedChordType === currentExercise.struct.name && selectedChordInv === currentExercise.inversion) {
    currentScore += 0.5;
    updateTopbarProgress();
    document.getElementById('feedback').innerText = 'נכון';
    document.getElementById('feedback').className = 'feedback success';
    triggerSuccessAndNext();
  }
}

function setupModeUI() {
  const rootContainer = document.getElementById('modeNoteNameButtons');
  const typeContainer = document.getElementById('modeTypeButtons');
  rootContainer.innerHTML = '';
  typeContainer.innerHTML = '';

  toggleAccidental('0');

  // במושמע בלבד לא שואלים על צליל היסוד, כי זה דורש שמיעה אבסולוטית: רק סוג הסולם, בנקודה מלאה
  modeRootGiven = document.getElementById('displayMode').value === 'audio_only';
  document.getElementById('modeRootPart').style.display = modeRootGiven ? 'none' : 'contents';
  document.getElementById('modeTypeTitle').innerText = modeRootGiven ? 'בחירת המודוס / הסולם:' : '2. בחירת המודוס / הסולם:';
  if (modeRootGiven) selectedNoteNameIdx = currentExercise.notes[0].nameIndex;

  NOTE_NAMES.forEach((n, idx) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.innerText = `${n.eng} / ${n.name}`;
    btn.onclick = () => checkModeNoteName(idx, btn);
    rootContainer.appendChild(btn);
  });

  currentExercise.optionsPool.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.dataset.name = opt.name;
    // בטלפון ההסבר שבסוגריים מוסתר, כדי שכל הכפתורים יהיו בשורה אחת ובאותו גובה
    const m = opt.name.match(/^(.*?)\s*(\(.*\))$/);
    if (m) {
      btn.textContent = m[1];
      const extra = document.createElement('span');
      extra.className = 'opt-extra';
      extra.textContent = ' ' + m[2];
      btn.appendChild(extra);
    } else {
      btn.textContent = opt.name;
    }
    btn.onclick = () => checkModeType(opt.name, btn);
    typeContainer.appendChild(btn);
  });
}

function setPendingLetter(next) {
  if (pendingLetter) pendingLetter.btn.classList.remove('pending');
  pendingLetter = next;
  if (next) next.btn.classList.add('pending');
}

// התו נכון אבל עוד לא נבחר סימן התק: מחכים לסימן במקום לסמן טעות
function waitsForAccidental(nameIdx, target) {
  return nameIdx === target.nameIndex && parseInt(selectedAccidental) === 0 && target.acc !== 0;
}

function checkModeNoteName(nameIdx, btn) {
  if (exerciseSolved) return;
  clearWrongButtons();
  const ex = currentExercise;
  // סימני מפתח: גם צליל היסוד של המז׳ור וגם של המינור המקביל נכונים
  const rootNote = ex.keySig ? (ex.answers.find(a => a.nameIndex === nameIdx) || ex.answers[0]) : ex.notes[0];
  setPendingLetter(null);

  if (waitsForAccidental(nameIdx, rootNote)) {
    setPendingLetter({ idx: nameIdx, btn, check: checkModeNoteName });
    document.getElementById('feedback').innerText = '';
    return;
  }

  if (nameIdx === rootNote.nameIndex && parseInt(selectedAccidental) === rootNote.acc) {
    if (ex.keySig) {
      document.querySelectorAll('#modeNoteNameButtons .opt-btn.correct').forEach(b => b.classList.remove('correct'));
      // הסוג שנבחר קודם שייך לצליל האחר: הצליל נכון, ועכשיו בוחרים את הסוג שמתאים לו
      if (selectedModeType && selectedModeType !== rootNote.struct.name) {
        selectedModeType = null;
        document.querySelectorAll('#modeTypeButtons .opt-btn.correct').forEach(b => b.classList.remove('correct'));
      }
    }
    btn.classList.add('correct');
    selectedNoteNameIdx = nameIdx;
    if (!typeAnsweredCorrectly) {
      currentScore += 0.5;
      typeAnsweredCorrectly = true;
      updateTopbarProgress();
    }
    document.getElementById('feedback').innerText = 'צליל יסוד נכון';
    document.getElementById('feedback').className = 'feedback success';
    checkModeComplete();
  } else {
    btn.classList.add('wrong');
    if (nameIdx === rootNote.nameIndex) setPendingLetter({ idx: nameIdx, btn, check: checkModeNoteName });
    noteWrong('צליל יסוד', 'root');
    document.getElementById('feedback').innerText = 'צליל יסוד שגוי';
    document.getElementById('feedback').className = 'feedback error';
  }
}

function checkModeType(typeName, btn) {
  if (exerciseSolved) return;
  clearWrongButtons();
  const ex = currentExercise;
  const right = ex.keySig
    ? ex.answers.some(a => a.struct.name === typeName && (selectedNoteNameIdx === null || a.nameIndex === selectedNoteNameIdx))
    : typeName === ex.struct.name;
  if (right) {
    if (selectedModeType && selectedModeType !== typeName) {
      document.querySelectorAll('#modeTypeButtons .opt-btn.correct').forEach(b => b.classList.remove('correct'));
    }
    btn.classList.add('correct');
    selectedModeType = typeName;
    document.getElementById('feedback').innerText = 'סוג נכון';
    document.getElementById('feedback').className = 'feedback success';
    checkModeComplete();
  } else {
    btn.classList.add('wrong');
    noteWrong(typeName);
    showWrongFeedback('סוג שגוי', currentExercise.optionsPool.find(o => o.name === typeName), 0);
  }
}

function checkModeComplete() {
  if (currentExercise.keySig) {
    const answer = currentExercise.answers.find(a => a.nameIndex === selectedNoteNameIdx && a.struct.name === selectedModeType);
    if (!answer) return;
    currentExercise.struct = answer.struct;
    currentScore += 0.5;
    updateTopbarProgress();
    document.getElementById('feedback').innerText = 'נכון';
    document.getElementById('feedback').className = 'feedback success';
    triggerSuccessAndNext();
    return;
  }
  const rootNote = currentExercise.notes[0];

  // selectedNoteNameIdx נקבע רק כשהצליל וסימן ההתק נכונים, כך ששינוי סימן אחר כך לא מבטל
  if (selectedNoteNameIdx === rootNote.nameIndex && selectedModeType === currentExercise.struct.name) {
    currentScore += modeRootGiven ? 1 : 0.5;
    updateTopbarProgress();
    document.getElementById('feedback').innerText = 'נכון';
    document.getElementById('feedback').className = 'feedback success';
    triggerSuccessAndNext();
  }
}

function setupNoteIdUI() {
  const container = document.getElementById('noteNameButtons');
  container.innerHTML = '';
  
  toggleAccidental('0');

  NOTE_NAMES.forEach((n, idx) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.innerText = `${n.eng} / ${n.name}`;
    btn.onclick = () => checkNoteAnswer(idx, btn);
    container.appendChild(btn);
  });

  renderPianoKeyboard();
}

function toggleAccidental(val) {
  clearWrongButtons();
  if (selectedAccidental === val) {
    selectedAccidental = '0';
  } else {
    selectedAccidental = val;
  }
  
  const accFlat = document.getElementById('accFlat');
  const accSharp = document.getElementById('accSharp');
  if (accFlat) accFlat.classList.toggle('selected', selectedAccidental === '-1');
  if (accSharp) accSharp.classList.toggle('selected', selectedAccidental === '1');

  const modeAccFlat = document.getElementById('modeAccFlat');
  const modeAccSharp = document.getElementById('modeAccSharp');
  if (modeAccFlat) modeAccFlat.classList.toggle('selected', selectedAccidental === '-1');
  if (modeAccSharp) modeAccSharp.classList.toggle('selected', selectedAccidental === '1');

  if (pendingLetter && !exerciseSolved) pendingLetter.check(pendingLetter.idx, pendingLetter.btn);
}

function renderPianoKeyboard() {
  const kb = document.getElementById('pianoKeyboard');
  kb.innerHTML = '';
  
  const keysLayout = [
    { name: 'C', pc: 0, hasBlack: true },
    { name: 'D', pc: 2, hasBlack: true },
    { name: 'E', pc: 4, hasBlack: false },
    { name: 'F', pc: 5, hasBlack: true },
    { name: 'G', pc: 7, hasBlack: true },
    { name: 'A', pc: 9, hasBlack: true },
    { name: 'B', pc: 11, hasBlack: false }
  ];

  keysLayout.forEach((k) => {
    const wKey = document.createElement('div');
    wKey.className = 'key-white';
    wKey.innerText = k.name;
    wKey.onclick = () => checkNoteAnswerByPc(k.pc, wKey);
    kb.appendChild(wKey);

    if (k.hasBlack) {
      const bKey = document.createElement('div');
      bKey.className = 'key-black';
      bKey.onclick = (e) => {
        e.stopPropagation();
        checkNoteAnswerByPc((k.pc + 1) % 12, bKey);
      };
      kb.appendChild(bKey);
    }
  });
}

function checkNoteAnswer(nameIdx, el) {
  if (exerciseSolved) return;
  clearWrongButtons();
  const correctNote = currentExercise.correctNote;
  const userAcc = parseInt(selectedAccidental);
  setPendingLetter(null);

  if (waitsForAccidental(nameIdx, correctNote)) {
    setPendingLetter({ idx: nameIdx, btn: el, check: checkNoteAnswer });
    document.getElementById('feedback').innerText = '';
    return;
  }

  if (nameIdx === correctNote.nameIndex && userAcc === correctNote.acc) {
    el.classList.add('correct');
    currentScore += 1;
    updateTopbarProgress();
    document.getElementById('feedback').innerText = 'נכון';
    document.getElementById('feedback').className = 'feedback success';
    triggerSuccessAndNext();
  } else {
    el.classList.add('wrong');
    noteWrong(NOTE_NAMES[nameIdx].name);
    if (nameIdx === correctNote.nameIndex) setPendingLetter({ idx: nameIdx, btn: el, check: checkNoteAnswer });
    document.getElementById('feedback').innerText = 'תו שגוי';
    document.getElementById('feedback').className = 'feedback error';
  }
}

// שם למקש בפסנתר: לבן לפי שמו, שחור כדיאז של הלבן שמתחתיו
function pcLabel(pc) {
  const white = NOTE_NAMES.find(n => n.pc === pc);
  return white ? white.name : NOTE_NAMES.find(n => n.pc === (pc + 11) % 12).name + '♯';
}

function checkNoteAnswerByPc(pc, el) {
  if (exerciseSolved) return;
  clearWrongButtons();
  const correctNote = currentExercise.correctNote;
  let targetPc = (T.LETTERS[correctNote.nameIndex].pc + correctNote.acc + 12) % 12;

  if (targetPc === pc) {
    el.classList.add('correct');
    currentScore += 1;
    updateTopbarProgress();
    document.getElementById('feedback').innerText = 'נכון';
    document.getElementById('feedback').className = 'feedback success';
    triggerSuccessAndNext();
  } else {
    el.classList.add('wrong');
    noteWrong(pcLabel(pc));
    document.getElementById('feedback').innerText = 'תו שגוי';
    document.getElementById('feedback').className = 'feedback error';
  }
}
