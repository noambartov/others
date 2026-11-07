// תרגול: השמעה. הקשר השמע (כולל התאוששות באייפון), הכלים (דגימות וצליל רך), הד החדר וסוף הצליל,
// והשמעת התרגיל הנוכחי.

// אחרי יציאה מהאפליקציה באייפון ההקשר נתקע (interrupted, או "running" בלי צליל), ולכן בחזרה בונים הקשר חדש.
// הדגימות נשמרות כ-AudioBuffer ומתאימות לכל הקשר, כך שאין טעינה מחדש.
let audioStale = false;

function setPlaybackSession() {
  // iOS 17 ומעלה: השמעה גם כשמתג השקט מופעל, כמו נגן מוזיקה
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
}

function getAudioContext() {
  if (audioCtx && (audioStale || audioCtx.state === 'closed')) {
    const old = audioCtx;
    audioCtx = null;
    playBus = null;
    try { old.close(); } catch (e) {}
  }
  audioStale = false;
  if (!audioCtx) {
    setPlaybackSession();
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // באייפון הקשר חדש נפתח רק כשמשמיעים בו משהו בתוך לחיצה, אז משמיעים רגע שקט
    try {
      const src = audioCtx.createBufferSource();
      src.buffer = audioCtx.createBuffer(1, 1, 22050);
      src.connect(audioCtx.destination);
      src.start(0);
    } catch (e) {}
  }
  if (audioCtx.state !== 'running') {
    const p = audioCtx.resume();
    if (p && p.catch) p.catch(() => {});
  }
  return audioCtx;
}

setPlaybackSession();

function markAudioStale() {
  if (!audioCtx) return;
  silenceAll(0);
  audioStale = true;
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) markAudioStale();
  else setPlaybackSession();
});
window.addEventListener('pagehide', markAudioStale);
window.addEventListener('pageshow', setPlaybackSession);
// הלחיצה הראשונה אחרי החזרה פותחת את הקשר החדש, גם אם ההשמעה עצמה תגיע מאוחר יותר (למשל אחרי תשובה נכונה)
['touchend', 'click', 'keydown'].forEach(type => document.addEventListener(type, () => {
  if (audioStale || (audioCtx && audioCtx.state !== 'running')) getAudioContext();
}, true));

// בטלפונים של אפל מתג השקט משתיק את הדף בגרסאות ישנות, ולכן מציגים פעם אחת הסבר קצר ליד כפתור ההשמעה
const SILENT_TIP_KEY = 'mt_silent_tip_seen';
function isAppleMobile() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function initSilentTip() {
  let seen = false;
  try { seen = localStorage.getItem(SILENT_TIP_KEY) === '1'; } catch (e) {}
  document.getElementById('silentTip').hidden = seen || !isAppleMobile();
}
function dismissSilentTip() {
  document.getElementById('silentTip').hidden = true;
  try { localStorage.setItem(SILENT_TIP_KEY, '1'); } catch (e) {}
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// כל השמעה מתנגנת דרך ערוץ משלה, כדי שאפשר יהיה להשתיק את מה שעוד מצלצל לפני ההשמעה הבאה
let playBus = null;

function newPlayBus(ctx) {
  silenceAll(0.08);
  playBus = ctx.createGain();
  playBus.connect(masterOut(ctx));
}

// מחזיר true אם היה צליל שעוד מצלצל
function silenceAll(fade) {
  if (!playBus) return false;
  const bus = playBus;
  const t = audioCtx.currentTime;
  bus.gain.cancelScheduledValues(t);
  bus.gain.setValueAtTime(bus.gain.value, t);
  bus.gain.linearRampToValueAtTime(0, t + fade);
  setTimeout(() => bus.disconnect(), fade * 1000 + 200);
  playBus = null;
  return true;
}

// stopAt: בסולם כל צליל משתתק כשמגיע הבא. במרווח ובאקורד מלודי אין stopAt: הצלילים ממשיכים לצלצל, כמו עם פדל
// release: כמה מהר הצליל נדעך אחרי stopAt
// fadeLen: במקום עצירה, דעיכה הדרגתית שמתחילה ב-stopAt ומגיעה לשקט אחרי fadeLen שניות
function playInstrumentNote(freq, startTime, stopAt = null, release = 0.04, fadeLen = 0) {
  const ctx = getAudioContext();
  const inst = document.getElementById('instrumentSelect').value;
  if (!playBus) newPlayBus(ctx);
  const damper = ctx.createGain();
  damper.connect(playBus);
  let srcStop = null;
  if (stopAt !== null && fadeLen > 0) {
    fadeOut(damper.gain, stopAt, fadeLen);
    srcStop = stopAt + fadeLen + 0.1;
  } else if (stopAt !== null) {
    damper.gain.setTargetAtTime(0, stopAt, release);
    srcStop = stopAt + release * 10;
  }
  // עד שהדגימות נטענות (או כשהדף נפתח מקובץ מקומי) מנגנים את הצליל הרך המסונתז
  if (inst !== 'soft' && sampleBuffers[inst]) playSampleNote(ctx, inst, freq, startTime, srcStop, damper);
  else {
    if (inst !== 'soft') loadSamples(inst);
    playSoftNote(ctx, freq, startTime, srcStop, damper);
  }
}

// צליל רך: טון יסוד ושלושה עליונים חלשים בלבד, שדועכים מהר יותר ככל שהם גבוהים.
// בצלילים נמוכים העליון השני חזק יותר, כדי שיישמעו גם ברמקול של טלפון
function playSoftNote(ctx, freq, t, stopAt, dest) {
  const amps = freq < 220 ? [0.8, 0.55, 0.22, 0.08] : [1, 0.35, 0.12, 0.04];
  const k = Math.pow(freq / 262, 0.3);
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(0.07, t + 0.006);
  out.connect(dest);
  const end = stopAt !== null ? stopAt : t + 6;
  amps.forEach((a, i) => {
    const h = i + 1;
    if (freq * h > 16000) return;
    const tau = 2.4 / k / Math.pow(h, 0.8);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * h, t);
    g.gain.setValueAtTime(a, t);
    g.gain.setTargetAtTime(0, t, tau);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(end);
  });
}

// דגימות אמיתיות, כל אחת כ-8 שניות של צלצול טבעי. צלילים שביניהן מוזזים בגובה מהדגימה הקרובה.
// פסנתר כנף Steinway B וויברפון בלי מנוע במקושים קשים, שניהם ממאגר VCSL (CC0). פרטים ב-sounds/README.md
const SAMPLE_SETS = {
  piano: { dir: 'sounds/piano/', gain: 0.4,
    notes: ['As1', 'C2', 'D2', 'E2', 'Fs2', 'Gs2', 'As2', 'C3', 'D3', 'E3', 'Fs3', 'Gs3', 'As3', 'C4', 'D4', 'E4', 'Fs4', 'Gs4', 'As4',
      'C5', 'D5', 'E5', 'Fs5', 'Gs5', 'As5', 'C6', 'D6', 'E6', 'Fs6', 'Gs6', 'As6', 'C7'] },
  vibraphone: { dir: 'sounds/vibraphone/', gain: 0.3,
    notes: ['A3', 'C4', 'E4', 'G4', 'B4', 'D5', 'F5', 'A5', 'C6', 'E6'] },
  harp: { dir: 'sounds/harp/', gain: 0.47,
    notes: ['G1', 'D2', 'F2', 'A2', 'C3', 'E3', 'G3', 'B3', 'D4', 'F4', 'A4', 'C5', 'E5', 'G5', 'B5', 'D6'] }
};
const sampleBuffers = {};
const sampleLoads = {};

function sampleNameToMidi(name) {
  const m = name.match(/^([A-G])(s?)(\d)$/);
  return 12 * (Number(m[3]) + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
}

// הפענוח נעשה בהקשר לא מקוון, כך שאפשר לטעון כבר בפתיחת הדף, לפני שהמשתמש לחץ על משהו
function loadSamples(inst) {
  const set = SAMPLE_SETS[inst];
  if (!set || sampleLoads[inst]) return;
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Offline || !window.fetch) return;
  const decoder = new Offline(1, 1, 44100);
  sampleLoads[inst] = Promise.all(set.notes.map(n =>
    fetch(set.dir + n + '.mp3')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => decoder.decodeAudioData(ab, res, rej)))
      .then(buffer => ({ midi: sampleNameToMidi(n), buffer }))
  )).then(list => { sampleBuffers[inst] = list; })
    .catch(() => { setTimeout(() => { delete sampleLoads[inst]; }, 5000); });
}

function playSampleNote(ctx, inst, freq, t, stopAt, dest) {
  const midi = 69 + 12 * Math.log2(freq / 440);
  const list = sampleBuffers[inst];
  let best = list[0];
  list.forEach(s => { if (Math.abs(s.midi - midi) < Math.abs(best.midi - midi)) best = s; });
  const src = ctx.createBufferSource();
  src.buffer = best.buffer;
  src.playbackRate.value = Math.pow(2, (midi - best.midi) / 12);
  const g = ctx.createGain();
  g.gain.value = SAMPLE_SETS[inst].gain;
  src.connect(g);
  g.connect(dest);
  src.start(t);
  if (stopAt !== null) src.stop(stopAt);
}

// יציאה משותפת עם קומפרסור, כדי שאקורדים לא יתעוותו, ורברב עדין וקצר של חדר
function masterOut(ctx) {
  if (!ctx._master) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 8;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    comp.connect(ctx.destination);
    const reverb = ctx.createConvolver();
    reverb.normalize = false;
    reverb.buffer = makeRoomImpulse(ctx, 1.5);
    const wet = ctx.createGain();
    wet.gain.value = 0.36;
    comp.connect(reverb);
    reverb.connect(wet);
    wet.connect(ctx.destination);
    ctx._master = comp;
  }
  return ctx._master;
}

// תגובת חדר: רעש שדועך ב-60dB לאורך rt שניות, מתכהה עם הזמן, ומתחיל אחרי 12ms
function makeRoomImpulse(ctx, rt) {
  const sr = ctx.sampleRate;
  const len = Math.floor(rt * sr);
  const buf = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-6.9 * i / len);
    for (let pass = 0; pass < 3; pass++) {
      for (let i = len - 1; i > 0; i--) d[i] = 0.55 * d[i] + 0.45 * d[i - 1];
    }
    const pre = Math.floor(0.012 * sr);
    for (let i = 0; i < pre; i++) d[i] = 0;
    let energy = 0;
    for (let i = 0; i < len; i++) energy += d[i] * d[i];
    const norm = 1 / Math.sqrt(energy);
    for (let i = 0; i < len; i++) d[i] *= norm;
  }
  return buf;
}

// סוף ההשמעה, לפי כלי. ויברפון: דעיכה טבעית שמתחילה כבר באטק של הצליל האחרון (בהרמוני: של כולם).
// פסנתר, נבל וצליל רך: עם פדל, הצליל דועך לבד
const ENDINGS = {
  vibraphone: { curve: 'exp', melodic: 3.5, harmonic: 4 },
  piano: { curve: 'natural', melodic: 6, harmonic: 6 },
  harp: { curve: 'natural', melodic: 6, harmonic: 6 },
  soft: { curve: 'natural', melodic: 6, harmonic: 6 }
};
function ending() {
  return ENDINGS[document.getElementById('instrumentSelect').value] || ENDINGS.piano;
}
// סולם מתנגן בלי פדל: בפסנתר גם הצליל האחרון נעצר כשהאצבע עוזבת את הקליד (כפעמיים צעד), בוויברפון הוא דועך כרגיל
function playScaleLastNote(f, t, step) {
  if (ending().curve === 'natural') playInstrumentNote(f, t, t + 2 * step, 0.08);
  else playInstrumentNote(f, t, t, 0, ending().melodic);
}

function fadeOut(param, from, len) {
  if (ending().curve !== 'exp') return;
  param.setValueAtTime(1, from);
  param.setTargetAtTime(0, from, len / 5);
}

function playCurrentExercise() {
  if (!currentExercise) return;
  // אחרי רמז השמעה, כל השמעה חוזרת בתרגיל הזה נשמעת בדרך המקלה
  if (currentExercise.hintPlay) { currentExercise.hintPlay(); return; }
  if (currentExercise.prog) { playProgression(); return; }
  playExerciseNotes(currentExercise.notes);
}

// מנגן צלילים כמו את התרגיל הנוכחי (סולם עולה ויורד, או מרווח ואקורד באותו כיוון נגינה)
function playExerciseNotes(notes) {
  const freqs = notes.map(n => midiToFreq(n.midiNum));
  const ctx = getAudioContext();
  newPlayBus(ctx);

  if (currentExercise.type === 'scales' || currentExercise.type === 'modes') {
    currentPlayDirection = 'ascending';
    updateFirstNoteButtonUI();
    const now = ctx.currentTime + 0.05;
    const all = [...freqs, ...[...freqs].reverse().slice(1)];
    all.forEach((f, idx) => {
      const last = idx === all.length - 1;
      if (!last) playInstrumentNote(f, now + idx * 0.3, now + (idx + 1) * 0.3);
      else playScaleLastNote(f, now + idx * 0.3, 0.3);
    });
    return;
  }

  let mode = currentExercise.playMode || document.getElementById('playMode').value;
  // באקראי מגרילים סוג נגינה פעם אחת לתרגיל, וכל השמעה חוזרת שלו נשמעת אותו דבר
  if (mode === 'random' || Array.isArray(mode)) {
    const modes = Array.isArray(mode) ? mode : ['harmonic', 'ascending', 'descending'];
    if (!modes.includes(currentExercise.randomPlay)) {
      currentExercise.randomPlay = modes[Math.floor(Math.random() * modes.length)];
    }
    mode = currentExercise.randomPlay;
  }

  currentPlayDirection = mode;
  updateFirstNoteButtonUI();

  const now = ctx.currentTime + 0.05;
  if (mode === 'harmonic') {
    freqs.forEach(f => playInstrumentNote(f, now, now, 0, ending().harmonic));
  } else {
    const ordered = mode === 'descending' ? [...freqs].reverse() : freqs;
    const lastStart = now + (ordered.length - 1) * 0.35;
    ordered.forEach((f, idx) => playInstrumentNote(f, now + idx * 0.35, lastStart, 0, ending().melodic));
  }
}

function playFirstNoteOnly() {
  if (!currentExercise || !currentExercise.notes || currentExercise.notes.length === 0) return;
  
  let targetNote;
  if (currentPlayDirection === 'descending') {
    targetNote = currentExercise.notes[currentExercise.notes.length - 1];
  } else {
    targetNote = currentExercise.notes[0];
  }

  const freq = midiToFreq(targetNote.midiNum);
  const ctx = getAudioContext();
  playInstrumentNote(freq, ctx.currentTime + 0.05);
}
