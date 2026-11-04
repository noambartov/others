// מערכת תגמולים לתרגול לבד: יעד יומי, רצף ימים, ואוסף שירים קטנים שנפתחים על הישגים.
// הכול נשמר במכשיר (localStorage) בלי הרשמה. הקובץ נטען אחרי הסקריפט הראשי של דף התרגול
// ומשתמש בפונקציות ההשמעה שלו (playInstrumentNote, midiToFreq, silenceAll). בדף הקצב, שאין בו את
// הפונקציות האלה, השירים מתנגנים בצליל רך פשוט משלו (ראו songAudio).
(function () {
  const KEY = 'mt_rewards';
  const GOALS = [10, 20, 40];
  const LETTER_IDX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
  const ACC = { '': 0, '#': 1, b: -1 };

  // 'D#5:.5' -> צליל עם משך בפעמות. 'R:.5' = הפסקה
  function parseNote(tok) {
    const [name, dur] = tok.split(':');
    const beats = dur ? parseFloat(dur) : 1;
    if (name === 'R') return { rest: true, beats };
    const m = name.match(/^([A-G])(#|b)?(\d)$/);
    const letter = LETTER_IDX[m[1]], acc = ACC[m[2] || ''], oct = +m[3];
    return {
      beats, acc,
      midi: (oct + 1) * 12 + LETTER_PC[letter] + acc,
      absLine: oct * 7 + letter - (4 * 7 + 2) // מפתח סול: הקו התחתון הוא מי 4
    };
  }
  const tune = s => s.trim().split(/\s+/).map(parseNote);

  // שירים בנחלת הכלל. המשכים ברבעים (1 = רבע, .5 = שמינית, .25 = שש-עשרית). R = הפסקה.
  // time = משקל, key = סימני היתק במפתח, pickup = אורך תיבת הפתיחה החלקית (אם יש), tempo = שניות לרבע
  const SONGS = {
    twinkle: { name: 'כוכב קטן', by: 'עממי צרפתי, וריאציות של מוצרט', tempo: 0.42, time: [4, 4], key: 'G',
      notes: tune('G4 G4 D5 D5 E5 E5 D5:2 C5 C5 B4 B4 A4 A4 G4:2') },
    jacques: { name: 'פרר ז׳אק', by: 'עממי צרפתי', tempo: 0.42, time: [4, 4], key: 'G',
      notes: tune('G4 A4 B4 G4 G4 A4 B4 G4 B4 C5 D5:2 B4 C5 D5:2') },
    ode: { name: 'אודה לשמחה', by: 'בטהובן, הסימפוניה התשיעית', tempo: 0.4, time: [4, 4], key: 'G',
      notes: tune('B4 B4 C5 D5 D5 C5 B4 A4 G4 G4 A4 B4 B4:1.5 A4:.5 A4:2') },
    lullaby: { name: 'שיר ערש', by: 'ברהמס', tempo: 0.42, time: [3, 4], key: 'C', pickup: 1,
      notes: tune('E4:.5 E4:.5 G4:2 E4:.5 E4:.5 G4:2 E4:.5 G4:.5 C5:1 B4:1.5 A4:.5 A4:1 G4:2') },
    minuet: { name: 'מינואט בסול מז׳ור', by: 'מהמחברת של אנה מגדלנה באך', tempo: 0.38, time: [3, 4], key: 'G',
      notes: tune('D5 G4:.5 A4:.5 B4:.5 C5:.5 D5 G4 G4 E5 C5:.5 D5:.5 E5:.5 F#5:.5 G5 G4 G4') },
    largo: { name: 'לארגו', by: 'דבוז׳ק, הסימפוניה מהעולם החדש', tempo: 0.55, time: [4, 4], key: 'F',
      notes: tune('A4:1.5 C5:.5 C5:2 A4:1.5 G4:.5 F4:2 G4 A4 C5 A4 G4:4') },
    fifth: { name: 'הסימפוניה החמישית', by: 'בטהובן', tempo: 0.4, time: [2, 4], key: 'Cm',
      notes: tune('R:.5 G4:.5 G4:.5 G4:.5 Eb4:2 R:.5 F4:.5 F4:.5 F4:.5 D4:2') },
    morning: { name: 'בוקר', by: 'גריג, פר גינט', tempo: 0.42, time: [6, 8], key: 'G',
      notes: tune('D5:.5 B4:.5 A4:.5 G4:.5 A4:.5 B4:.5 D5:.5 B4:.5 A4:.5 G4:.5 A4:.5 B4:.5 A4:.5 B4:.5 D5:.5 B4:.5 D5:.5 E5:.5 B4:.5 E5:.5 D5:.5 B4:.5 A4:.5 G4:.5') },
    elise: { name: 'לאליזה', by: 'בטהובן', tempo: 0.5, time: [3, 8], key: 'C', pickup: 0.5,
      notes: tune('E5:.25 D#5:.25 E5:.25 D#5:.25 E5:.25 B4:.25 D5:.25 C5:.25 A4:.5 R:.25 C4:.25 E4:.25 A4:.25 B4:.5 R:.25 E4:.25 G#4:.25 B4:.25 C5:.5') },
    canon: { name: 'קנון', by: 'פכלבל', tempo: 0.42, time: [4, 4], key: 'C',
      notes: tune('E5:2 D5:2 C5:2 B4:2 A4:2 G4:2 A4:2 B4:2') },
    mountain: { name: 'בהיכל מלך ההרים', by: 'גריג, פר גינט', tempo: 0.4, time: [4, 4], key: 'C',
      notes: tune('A4:.5 B4:.5 C5:.5 D5:.5 E5:.5 C5:.5 E5 D#5:.5 B4:.5 D#5 D5:.5 Bb4:.5 D5 A4:.5 B4:.5 C5:.5 D5:.5 E5:.5 C5:.5 E5:.5 A5:.5 G5:.5 E5:.5 C5:.5 E5:.5 G5:2') },
    nacht: { name: 'מוזיקת לילה זעירה', by: 'מוצרט', tempo: 0.42, time: [4, 4], key: 'G',
      notes: tune('G4 R:.5 D4:.5 G4 R:.5 D4:.5 G4:.5 D4:.5 G4:.5 B4:.5 D5:2 C5 R:.5 A4:.5 C5 R:.5 A4:.5 C5:.5 A4:.5 F#4:.5 A4:.5 D4:2') }
  };

  // ---------- מיומנויות ----------
  // מיומנות = מצב (קריאה או שמיעה) + סוג תרגיל. השליטה נמדדת לפי 20 התשובות האחרונות (ניסיון ראשון, בלי עזרה)
  const SKILLS = [
    { key: 'read:note_id', mode: 'read', type: 'note_id', name: 'זיהוי תווים' },
    { key: 'read:intervals', mode: 'read', type: 'intervals', name: 'מרווחים' },
    { key: 'read:chords', mode: 'read', type: 'chords', name: 'משולשים' },
    { key: 'read:septachords', mode: 'read', type: 'septachords', name: 'ספטאקורדים' },
    { key: 'read:scales', mode: 'read', type: 'scales', name: 'סולמות' },
    { key: 'read:modes', mode: 'read', type: 'modes', name: 'מודוסים' },
    { key: 'ear:intervals', mode: 'ear', type: 'intervals', name: 'מרווחים' },
    { key: 'ear:chords', mode: 'ear', type: 'chords', name: 'משולשים' },
    { key: 'ear:septachords', mode: 'ear', type: 'septachords', name: 'ספטאקורדים' },
    { key: 'ear:scales', mode: 'ear', type: 'scales', name: 'סולמות' },
    { key: 'ear:modes', mode: 'ear', type: 'modes', name: 'מודוסים' },
    // קצב: התרגול עצמו בדף הקצב (rhythm_practice.html), הסוג = state.kind שם
    { key: 'rhythm:dictation', mode: 'rhythm', type: 'dictation', name: 'הכתבה' },
    { key: 'rhythm:tap', mode: 'rhythm', type: 'tap', name: 'קריאה והקשה' },
    { key: 'rhythm:complete', mode: 'rhythm', type: 'complete', name: 'השלמת תיבה' }
  ];
  const MODE_NAME = { read: 'קריאה', ear: 'שמיעה', rhythm: 'קצב' };
  const PRACTICE_PAGE = 'music_theory_exercise_tool.html';
  const RHYTHM_PAGE = 'rhythm_practice.html';
  const onRhythmPage = () => !window.startDailyMix;
  const LEVEL_NAMES = ['עוד לא תורגל', 'מתחיל', 'בטוח', 'שולט'];
  const WINDOW = 20;
  function skillLabel(sk) { return sk.mode === 'rhythm' ? `קצב: ${sk.name}` : `${sk.name} ב${MODE_NAME[sk.mode]}`; }
  function skillStats(s, key) {
    const h = (s.skills && s.skills[key]) || [];
    const n = h.length, ok = h.filter(Boolean).length;
    const acc = n ? ok / n : 0;
    let level = 0;
    if (n >= WINDOW && acc >= 0.9) level = 3;
    else if (n >= 10 && acc >= 0.75) level = 2;
    else if (n) level = 1;
    // ציון רציף בין 0 ל-1, לסידור התרגול היומי: מעט תשובות = ציון נמוך
    return { n, ok, acc, level, score: acc * Math.min(n, WINDOW) / WINDOW };
  }
  const countLevel = (s, min, mode) => SKILLS.filter(sk => (!mode || sk.mode === mode) && skillStats(s, sk.key).level >= min).length;

  // הסדר הוא גם סדר הקושי. כל הישג פותח שיר אחד
  const ACHIEVEMENTS = [
    { id: 'first', song: 'twinkle', how: 'התרגיל הראשון', test: s => s.total >= 1 },
    { id: 'goal1', song: 'jacques', how: 'להשלים יעד יומי', test: s => s.met.length >= 1 },
    { id: 'sure1', song: 'ode', how: 'מיומנות ראשונה בדרגת בטוח', test: s => countLevel(s, 2) >= 1 },
    { id: 'streak3', song: 'lullaby', how: '3 ימים ברצף', test: s => streak(s) >= 3 },
    { id: 'run10', song: 'minuet', how: '10 תשובות נכונות ברצף', test: s => s.bestRun >= 10 },
    { id: 'master1', song: 'largo', how: 'מיומנות ראשונה בדרגת שולט', test: s => countLevel(s, 3) >= 1 },
    { id: 'streak7', song: 'morning', how: '7 ימים ברצף', test: s => streak(s) >= 7 },
    { id: 'both', song: 'fifth', how: 'שליטה גם בקריאה וגם בשמיעה', test: s => countLevel(s, 3, 'read') >= 1 && countLevel(s, 3, 'ear') >= 1 },
    { id: 'pass', song: 'elise', how: 'לעבור רמה באימון לפי שלבים', test: s => s.passed.length >= 1 },
    { id: 'master3', song: 'canon', how: '3 מיומנויות בדרגת שולט', test: s => countLevel(s, 3) >= 3 },
    { id: 'run25', song: 'mountain', how: '25 תשובות נכונות ברצף', test: s => s.bestRun >= 25 },
    { id: 'allsure', song: 'nacht', how: 'כל המיומנויות שבחרת, לפחות 3, בדרגת בטוח',
      test: s => s.chosen.length >= 3 && s.chosen.every(k => skillStats(s, k).level >= 2) }
  ];

  function dayKey(d = new Date()) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return dayKey(d);
  }

  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    return Object.assign({ goal: 20, days: {}, met: [], run: 0, bestRun: 0, total: 0, passed: [], perfect: false, unlocked: {}, skills: {}, chosen: [] }, s || {});
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  // רצף ימים שבהם הושלם היעד, עד היום (או עד אתמול, אם היום עוד לא הושלם)
  function streak(s) {
    let n = 0, i = s.met.includes(dayKey()) ? 0 : 1;
    while (s.met.includes(daysAgo(i))) { n++; i++; }
    return n;
  }

  function unlockNew(s) {
    const fresh = ACHIEVEMENTS.filter(a => !s.unlocked[a.id] && a.test(s));
    fresh.forEach(a => { s.unlocked[a.id] = Date.now(); });
    return fresh;
  }

  // ---------- תיווי המנגינה: משקל, תיבות, משכים, קורות והפסקות ----------
  // יחידת מידה פנימית: S = רווח אחד בין קווי החמשה. ה-SVG מוקטן לפי הרוחב שלו בדף.
  const S = 8;
  const KEYS = {
    C: [], Am: [],
    G: [{ letter: 3, acc: 1, line: 8 }],
    F: [{ letter: 6, acc: -1, line: 4 }],
    Cm: [{ letter: 6, acc: -1, line: 4 }, { letter: 2, acc: -1, line: 7 }, { letter: 5, acc: -1, line: 3 }]
  };
  const letterOf = absLine => ((absLine + 2) % 7 + 7) % 7; // 0 = דו
  const INK = '#222222';

  function barLength(song) { return song.time[0] * 4 / song.time[1]; }
  // אורך קבוצת הקורה ברבעים
  function beamGroup(song) {
    const [n, d] = song.time;
    if (d === 8) return 1.5;
    if (n === 3) return 1;
    return 2;
  }
  function baseDur(d) {
    for (const b of [4, 2, 1, 0.5, 0.25]) {
      if (Math.abs(d - b) < 1e-6) return { base: b, dot: false };
      if (Math.abs(d - b * 1.5) < 1e-6) return { base: b, dot: true };
    }
    return { base: 1, dot: false };
  }
  function noteSpace(d) { return 10 + 14 * Math.pow(d, 0.6); }

  // חלוקה לתיבות, וחישוב סימני ההיתק שצריך לכתוב (לפי המפתח ולפי מה שכבר נכתב באותה תיבה)
  function layoutMeasures(song) {
    const bar = barLength(song);
    const keyAcc = {};
    KEYS[song.key || 'C'].forEach(k => { keyAcc[k.letter] = k.acc; });
    const measures = [];
    let cur = null, cap = 0, filled = 0, pos = 0;
    song.notes.forEach((n, i) => {
      if (!cur || filled >= cap - 1e-6) {
        cap = measures.length === 0 && song.pickup ? song.pickup : bar;
        cur = { events: [], start: bar - cap, seen: {} };
        measures.push(cur);
        filled = 0;
      }
      const ev = Object.assign({ i, at: cur.start + filled }, n, baseDur(n.beats));
      if (!n.rest) {
        const current = n.absLine in cur.seen ? cur.seen[n.absLine] : (keyAcc[letterOf(n.absLine)] || 0);
        ev.showAcc = n.acc !== current;
        cur.seen[n.absLine] = n.acc;
      }
      ev.w = noteSpace(n.beats) + (ev.showAcc ? 9 : 0) + (ev.dot ? 4 : 0);
      cur.events.push(ev);
      filled += n.beats;
      pos += n.beats;
    });
    measures.forEach(m => { m.w = 8 + m.events.reduce((t, e) => t + e.w, 0); });
    return measures;
  }

  // קבוצות קורה: שמיניות ושש-עשריות רצופות באותה פעמה, בלי הפסקה ביניהן
  function beamGroups(song, m) {
    const g = beamGroup(song);
    const groups = [];
    let run = [], runKey = null;
    const flush = () => { if (run.length) groups.push(run); run = []; runKey = null; };
    m.events.forEach(e => {
      const beamable = !e.rest && e.base <= 0.5;
      const key = Math.floor((e.at + 1e-6) / g);
      if (!beamable || key !== runKey) flush();
      if (beamable) { run.push(e); runKey = key; }
    });
    flush();
    return groups;
  }

  function hollowHead(cx, y, fill) {
    return `<ellipse cx="${cx}" cy="${y}" rx="${S * 0.62}" ry="${S * 0.46}" transform="rotate(-20 ${cx} ${y})" fill="${fill}"/>` +
      `<ellipse cx="${cx}" cy="${y}" rx="${S * 0.42}" ry="${S * 0.2}" transform="rotate(-35 ${cx} ${y})" fill="#ffffff"/>`;
  }
  function wholeHead(cx, y, fill) {
    return `<ellipse cx="${cx}" cy="${y}" rx="${S * 0.78}" ry="${S * 0.48}" fill="${fill}"/>` +
      `<ellipse cx="${cx}" cy="${y}" rx="${S * 0.3}" ry="${S * 0.36}" transform="rotate(-50 ${cx} ${y})" fill="#ffffff"/>`;
  }
  function flagPath(x, tipY, up, count, fill) {
    let out = '';
    for (let k = 0; k < count; k++) {
      const y0 = tipY + (up ? 1 : -1) * k * S * 0.8;
      const d = up
        ? `M${x} ${y0} c0 ${S * 0.5} ${S * 1.1} ${S * 0.9} ${S * 0.9} ${S * 2} c0.3 ${-S * 0.9} ${-S * 0.5} ${-S * 1.3} ${-S * 0.9} ${-S * 1.4} Z`
        : `M${x} ${y0} c0 ${-S * 0.5} ${S * 1.1} ${-S * 0.9} ${S * 0.9} ${-S * 2} c0.3 ${S * 0.9} ${-S * 0.5} ${S * 1.3} ${-S * 0.9} ${S * 1.4} Z`;
      out += `<path d="${d}" fill="${fill}"/>`;
    }
    return out;
  }
  function restSvg(base, x, staff, fill) {
    const mid = staff.bottomY - 2 * S;
    if (base >= 4) return `<rect x="${x - S * 0.6}" y="${mid - S}" width="${S * 1.2}" height="${S * 0.5}" fill="${fill}"/>`;
    if (base >= 2) return `<rect x="${x - S * 0.6}" y="${mid - S * 0.5}" width="${S * 1.2}" height="${S * 0.5}" fill="${fill}"/>`;
    if (base >= 1) {
      const u = S / 8;
      return `<path d="M${x - 2 * u} ${mid - 12 * u} l${5 * u} ${6 * u} l${-4 * u} ${5 * u} l${4.5 * u} ${6 * u} c${-3 * u} ${-2 * u} ${-6 * u} ${-1 * u} ${-3 * u} ${5 * u}" fill="none" stroke="${fill}" stroke-width="${S * 0.24}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    // שמינית ושש-עשרית: נקודה עם זנב אלכסוני
    const dots = base >= 0.5 ? 1 : 2;
    let out = `<line x1="${x + S * 0.55}" y1="${mid - S * 0.6}" x2="${x - S * 0.2}" y2="${mid + S * (dots === 1 ? 1.2 : 1.9)}" stroke="${fill}" stroke-width="${S * 0.15}" stroke-linecap="round"/>`;
    for (let k = 0; k < dots; k++) {
      const yy = mid - S * 0.45 + k * S * 0.85;
      const xx = x - S * 0.35 - k * S * 0.2;
      out += `<circle cx="${xx}" cy="${yy}" r="${S * 0.24}" fill="${fill}"/>` +
        `<path d="M${xx} ${yy + S * 0.05} q${S * 0.5} ${S * 0.3} ${S * 0.95 - k * S * 0.2} ${-S * 0.15}" fill="none" stroke="${fill}" stroke-width="${S * 0.13}"/>`;
    }
    return out;
  }

  // opts.width: רוחב שורה (שורות נשברות לפי תיבות). opts.bars: רק התיבות הראשונות. opts.locked: חמשה ריקה
  function melodySvg(song, opts = {}) {
    const T = window.TheoryCore.svg;
    const fill = opts.locked ? '#d6d6d6' : INK;
    const lineColor = opts.locked ? '#e2e2e2' : '#bdbdbd';
    let measures = layoutMeasures(song);
    if (opts.bars) {
      const n = opts.bars + (song.pickup ? 1 : 0);
      measures = measures.slice(0, n);
    }
    const key = KEYS[song.key || 'C'];
    const clefW = 30, keyW = key.length * 9 + (key.length ? 4 : 0), timeW = 18;
    // שבירת שורות
    const maxW = opts.width || Infinity;
    const systems = [];
    let sys = null;
    measures.forEach(m => {
      const head = clefW + keyW + (systems.length === 0 && !sys ? timeW : 0);
      if (!sys || sys.w + m.w > maxW) {
        sys = { measures: [], w: clefW + keyW + (systems.length === 0 ? timeW : 0), head: clefW + keyW + (systems.length === 0 ? timeW : 0) };
        systems.push(sys);
      }
      sys.measures.push(m);
      sys.w += m.w;
    });
    const W = opts.width && isFinite(opts.width) ? opts.width : Math.max(...systems.map(s => s.w)) + 2;
    const sysH = S * 11;
    let out = '';
    systems.forEach((sy, si) => {
      const top = si * sysH + S * 3.6;
      const staff = { bottomY: top + 4 * S, space: S };
      const isLast = si === systems.length - 1;
      // מתיחה לרוחב השורה. שורה אחרונה קצרה נשארת ברוחב הטבעי
      const content = sy.w - sy.head;
      const avail = W - sy.head - 2;
      const scale = (isLast && content < avail * 0.7) ? 1 : avail / content;
      const endX = sy.head + content * scale;
      for (let l = 0; l <= 8; l += 2) {
        const y = T.lineY(staff, l);
        out += `<line x1="0" y1="${y}" x2="${endX}" y2="${y}" stroke="${lineColor}" stroke-width="0.9"/>`;
      }
      out += T.clef('sol', 14, staff, opts.locked ? '#d6d6d6' : '#444444');
      let x = clefW;
      key.forEach(k => { out += T.accidental(k.acc, x + 8, T.lineY(staff, k.line), S, fill); x += 9; });
      if (key.length) x += 4;
      if (si === 0) {
        const mid = staff.bottomY - 2 * S;
        const tf = `font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${S * 2.3}" text-anchor="middle" fill="${fill}"`;
        out += `<text x="${x + 8}" y="${mid - S * 0.15}" ${tf}>${song.time[0]}</text><text x="${x + 8}" y="${mid + S * 1.85}" ${tf}>${song.time[1]}</text>`;
        x += timeW;
      }
      if (opts.locked) return;
      sy.measures.forEach((m, mi) => {
        let ex = x + 8 * scale;
        const pos = new Map();
        m.events.forEach(e => {
          const cx = ex + (e.showAcc ? 9 : 0) + 5;
          pos.set(e, cx);
          ex += e.w * scale;
        });
        x += m.w * scale;
        // קורות
        const groups = beamGroups(song, m);
        const inBeam = new Set();
        const stemInfo = new Map();
        groups.filter(g => g.length > 1).forEach(g => {
          g.forEach(e => inBeam.add(e));
          const avg = g.reduce((t, e) => t + e.absLine, 0) / g.length;
          const up = avg < 4;
          const ys = g.map(e => T.lineY(staff, e.absLine));
          const beamY = up ? Math.min(...ys) - 3.4 * S : Math.max(...ys) + 3.4 * S;
          const hw = T.glyphWidth('noteheadBlack', S) / 2;
          const sx = e => up ? pos.get(e) + hw - 0.6 : pos.get(e) - hw + 0.6;
          g.forEach(e => stemInfo.set(e, { up, tip: beamY }));
          const th = S * 0.48, dir = up ? 1 : -1;
          const x1 = sx(g[0]), x2 = sx(g[g.length - 1]);
          out += `<path d="M${x1 - 0.6} ${beamY} L${x2 + 0.6} ${beamY} L${x2 + 0.6} ${beamY + dir * th} L${x1 - 0.6} ${beamY + dir * th} Z" fill="${fill}"/>`;
          // קורה שנייה לשש-עשריות סמוכות
          for (let k = 0; k < g.length - 1; k++) {
            if (g[k].base <= 0.25 && g[k + 1].base <= 0.25) {
              const yy = beamY + dir * S * 0.78;
              out += `<path d="M${sx(g[k]) - 0.6} ${yy} L${sx(g[k + 1]) + 0.6} ${yy} L${sx(g[k + 1]) + 0.6} ${yy + dir * th} L${sx(g[k]) - 0.6} ${yy + dir * th} Z" fill="${fill}"/>`;
            }
          }
        });
        m.events.forEach(e => {
          const cx = pos.get(e);
          if (e.rest) { out += restSvg(e.base, cx, staff, fill); return; }
          const y = T.lineY(staff, e.absLine);
          const hw = T.glyphWidth('noteheadBlack', S) / 2;
          let g = '';
          if (e.showAcc) g += T.accidental(e.acc, cx - hw - 1.5, y, S, fill);
          g += T.ledgerLines(cx, e.absLine, staff, 7, fill);
          if (e.base >= 4) g += wholeHead(cx, y, fill);
          else if (e.base >= 2) g += hollowHead(cx, y, fill);
          else g += T.notehead(cx, y, S, fill);
          if (e.dot) g += `<circle cx="${cx + hw + 3.5}" cy="${e.absLine % 2 === 0 ? y - S / 2 : y}" r="${S * 0.17}" fill="${fill}"/>`;
          // גבעול
          if (e.base < 4) {
            const info = stemInfo.get(e) || { up: e.absLine < 4, tip: null };
            const up = info.up;
            const tip = info.tip !== null ? info.tip : (up ? y - 3.4 * S : y + 3.4 * S);
            const sx = up ? cx + hw - 0.6 : cx - hw + 0.6;
            g += `<line x1="${sx}" y1="${y}" x2="${sx}" y2="${tip}" stroke="${fill}" stroke-width="1.1"/>`;
            if (!inBeam.has(e) && e.base <= 0.5) g += flagPath(sx, tip, up, e.base <= 0.25 ? 2 : 1, fill);
          }
          out += `<g class="mel-note" data-i="${e.i}">${g}</g>`;
        });
        // קו תיבה
        const bx = x;
        const yT = T.lineY(staff, 8), yB = T.lineY(staff, 0);
        const final = !opts.bars && isLast && mi === sy.measures.length - 1;
        if (final) {
          out += `<line x1="${bx - 4}" y1="${yT}" x2="${bx - 4}" y2="${yB}" stroke="${fill}" stroke-width="0.9"/>` +
            `<rect x="${bx - 2}" y="${yT}" width="2.6" height="${yB - yT}" fill="${fill}"/>`;
        } else {
          out += `<line x1="${bx}" y1="${yT}" x2="${bx}" y2="${yB}" stroke="${lineColor === '#bdbdbd' ? '#888888' : lineColor}" stroke-width="0.9"/>`;
        }
      });
    });
    const H = systems.length * sysH + S * 1.5;
    return `<svg class="mel-svg" viewBox="0 0 ${W + 1} ${H}" preserveAspectRatio="xMidYMid meet">${out}</svg>`;
  }

  // השמעה: בדף התרגול דרך הכלי שנבחר; בדף אחר בצליל רך פשוט
  let ownCtx = null, ownBus = null;
  const songAudio = {
    ctx() {
      if (typeof getAudioContext === 'function' && typeof playInstrumentNote === 'function') return getAudioContext();
      if (!ownCtx) ownCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (ownCtx.state !== 'running') ownCtx.resume();
      return ownCtx;
    },
    note(midi, start, stop, release) {
      if (typeof playInstrumentNote === 'function') return playInstrumentNote(midiToFreq(midi), start, stop, release);
      const ctx = this.ctx();
      if (!ownBus) { ownBus = ctx.createGain(); ownBus.connect(ctx.destination); }
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.22, start + 0.01);
      g.gain.setTargetAtTime(0.08, start + 0.02, 0.25);
      g.gain.setTargetAtTime(0, stop, release * 2 + 0.03);
      osc.connect(g); g.connect(ownBus);
      osc.start(start); osc.stop(stop + release * 12 + 0.3);
    },
    silence(fade) {
      if (typeof silenceAll === 'function') return silenceAll(fade);
      if (!ownBus || !ownCtx) return;
      const bus = ownBus, t = ownCtx.currentTime;
      bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.linearRampToValueAtTime(0, t + fade);
      setTimeout(() => bus.disconnect(), fade * 1000 + 200);
      ownBus = null;
    }
  };

  let playTimers = [];
  function playSong(id, svgHost) {
    const song = SONGS[id];
    playTimers.forEach(clearTimeout);
    playTimers = [];
    songAudio.silence(0.05);
    const ctx = songAudio.ctx();
    const t0 = ctx.currentTime + 0.1;
    let t = 0;
    const els = svgHost ? [...svgHost.querySelectorAll('.mel-note')] : [];
    els.forEach(e => e.classList.remove('lit'));
    const svg = svgHost && svgHost.querySelector('.mel-svg');
    document.querySelectorAll('.mel-svg.playing').forEach(x => x.classList.remove('playing'));
    if (svg) svg.classList.add('playing');
    song.notes.forEach((n, i) => {
      const dur = n.beats * song.tempo;
      if (!n.rest) {
        const last = i === song.notes.length - 1;
        songAudio.note(n.midi, t0 + t, t0 + t + dur * (last ? 3 : 0.95), last ? 0.4 : 0.06);
        const el = svgHost && svgHost.querySelector(`.mel-note[data-i="${i}"]`);
        if (el) playTimers.push(setTimeout(() => {
          els.forEach(e => e.classList.remove('lit'));
          el.classList.add('lit');
        }, (t + 0.1) * 1000));
      }
      t += dur;
    });
    playTimers.push(setTimeout(() => {
      els.forEach(e => e.classList.remove('lit'));
      if (svg) svg.classList.remove('playing');
    }, (t + 0.6) * 1000));
  }

  // ---------- הודעות ----------
  function toast(text) {
    let el = document.getElementById('rewardToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rewardToast';
      el.className = 'reward-toast';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3200);
  }

  // חגיגה כשנפתח שיר: "כל הכבוד!" גדול, החלון קופץ פנימה, ונצנצים בשחור ואפור מתפזרים ממנו
  const celebrate = { bravo: true, sparkles: true };
  const BRAVO = ['כל הכבוד!'];
  const SPARKLE = 'M0 -10 C1.4 -1.4 1.4 -1.4 10 0 C1.4 1.4 1.4 1.4 0 10 C-1.4 1.4 -1.4 1.4 -10 0 C-1.4 -1.4 -1.4 -1.4 0 -10Z';
  function sparkles(box) {
    if (!celebrate.sparkles) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = box.getBoundingClientRect();
    const layer = document.createElement('div');
    layer.className = 'rw-sparkles';
    const cx = r.left + r.width / 2, cy = r.top + Math.min(70, r.height / 3);
    const N = 34;
    let html = '';
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 140 + Math.random() * 190;
      const size = 12 + Math.random() * 20;
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * 0.8 - 30;
      const delay = Math.random() * 0.35 + (i % 3 === 0 ? 0.5 : 0);
      const color = i % 3 === 1 ? '#9a9a9a' : (i % 3 === 2 ? '#c8c8c8' : '#222222');
      html += `<svg class="rw-sparkle" viewBox="-10 -10 20 20" width="${size}" height="${size}"
        style="left:${cx - size / 2}px;top:${cy - size / 2}px;--dx:${dx}px;--dy:${dy}px;--rot:${Math.round(Math.random() * 180 - 90)}deg;animation-delay:${delay.toFixed(2)}s">
        <path d="${SPARKLE}" fill="${color}"/></svg>`;
    }
    layer.innerHTML = html;
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 2600);
  }

  let afterUnlock = null;
  function showUnlock(list, then) {
    afterUnlock = then || null;
    const a = list[0];
    const song = SONGS[a.song];
    const more = list.length > 1 ? `<p class="reward-more">ועוד ${list.length - 1} ${list.length === 2 ? 'שיר' : 'שירים'} באוסף</p>` : '';
    let dlg = document.getElementById('rewardDialog');
    if (!dlg) {
      dlg = document.createElement('div');
      dlg.id = 'rewardDialog';
      dlg.className = 'share-dialog rw-dialog';
      document.body.appendChild(dlg);
    }
    const bravo = celebrate.bravo ? `<p class="reward-bravo">${BRAVO[Math.floor(Math.random() * BRAVO.length)]}</p>` : '';
    dlg.innerHTML = `<div class="share-box reward-box${celebrate.bravo ? ' celebrate' : ''}" role="dialog">
      ${bravo}
      <p class="reward-kicker">שיר חדש באוסף</p>
      <h3>${song.name}</h3>
      <p class="reward-by">${song.by}</p>
      <div class="reward-staff" id="rewardStaff">${melodySvg(song, { width: 380 })}</div>
      <p class="reward-how">על: ${a.how}</p>
      ${more}
      <div class="share-actions rw-actions">
        <button class="primary" onclick="Rewards.closeUnlock()">המשך</button>
        <button onclick="Rewards.play('${a.song}', document.getElementById('rewardStaff'))">נגן שוב</button>
        <button onclick="Rewards.closeUnlock(); Rewards.open()">לאוסף</button>
      </div>
    </div>`;
    dlg.hidden = false;
    sparkles(dlg.querySelector('.reward-box'));
    setTimeout(() => playSong(a.song, document.getElementById('rewardStaff')), 250);
  }
  function closeUnlock() {
    const dlg = document.getElementById('rewardDialog');
    if (dlg) dlg.hidden = true;
    playTimers.forEach(clearTimeout);
    songAudio.silence(0.3);
    const fn = afterUnlock;
    afterUnlock = null;
    if (fn) setTimeout(fn, 400);
  }

  // ---------- אירועים מדף התרגול ----------
  // נקרא אחרי כל תרגיל שנפתר. clean = נכון בניסיון הראשון ובלי עזרה.
  // מחזיר את ההישגים החדשים (אם יש) כדי שהדף יחכה עם התרגיל הבא
  // skill = 'read:intervals' וכו'. ליעד היומי נספרים רק תרגילים במיומנויות שנבחרו (או הכול, כשעוד לא נבחרו)
  function recordSkill(s, skill, clean) {
    if (!skill) return;
    const h = s.skills[skill] = s.skills[skill] || [];
    h.push(!!clean);
    if (h.length > WINDOW) h.splice(0, h.length - WINDOW);
  }
  // היסטוריה לפי פריט (מרווח, אקורד, סולם...) ובלבולים: מה נבחר במקום התשובה. רק הניסיון הראשון בכל תרגיל
  const HIST_MAX = 300;
  function recordItem(s, skill, clean, detail) {
    if (!skill || !detail || !detail.item) return;
    const h = s.hist = s.hist || [];
    const e = { k: skill, i: detail.item, ok: !!clean };
    if (!clean && detail.chose && detail.chose !== detail.item) e.c = detail.chose;
    h.push(e);
    if (h.length > HIST_MAX) h.splice(0, h.length - HIST_MAX);
  }
  function counts(s, skill) { return !s.chosen.length || s.chosen.includes(skill); }

  function solved(clean, skill, detail) {
    const s = load();
    const today = dayKey();
    const before = skill ? skillStats(s, skill).level : 0;
    recordSkill(s, skill, clean);
    recordItem(s, skill, clean, detail);
    const after = skill ? skillStats(s, skill).level : 0;
    s.total++;
    if (counts(s, skill)) s.days[today] = (s.days[today] || 0) + 1;
    s.run = clean ? s.run + 1 : 0;
    s.bestRun = Math.max(s.bestRun, s.run);
    let goalHit = false;
    if (s.days[today] >= s.goal && !s.met.includes(today)) {
      s.met.push(today);
      goalHit = true;
    }
    const fresh = unlockNew(s);
    save(s);
    renderChip();
    if (goalHit && !fresh.length) {
      const n = streak(s);
      toast(n > 1 ? `היעד היומי הושלם. ${n} ימים ברצף` : 'היעד היומי הושלם');
    } else if (!fresh.length && after > before && after >= 2) {
      const sk = SKILLS.find(x => x.key === skill);
      toast(`${skillLabel(sk)}: ${LEVEL_NAMES[after]}`);
    } else if (clean && !fresh.length && [5, 15, 20].includes(s.run)) {
      toast(`${s.run} נכונות ברצף`);
    }
    return fresh;
  }

  // דילוג על תרגיל שלא נפתר: שובר את הרצף ונספר כטעות במיומנות
  function broke(skill, detail) {
    const s = load();
    s.run = 0;
    recordSkill(s, skill, false);
    recordItem(s, skill, false, detail);
    save(s);
  }

  function toggleSkill(key) {
    const s = load();
    const i = s.chosen.indexOf(key);
    if (i >= 0) s.chosen.splice(i, 1); else s.chosen.push(key);
    save(s);
    render();
  }

  // התרגול היומי: 20 תרגילים מהמיומנויות שנבחרו. מיומנות חלשה מקבלת יותר תרגילים, וכל אחת לפחות אחד
  function dailyPlan(length) {
    const s = load();
    const chosen = SKILLS.filter(sk => sk.mode !== 'rhythm' && s.chosen.includes(sk.key));
    if (!chosen.length) return null;
    const weights = chosen.map(sk => 1 + 2 * (1 - skillStats(s, sk.key).score));
    const total = weights.reduce((a, b) => a + b, 0);
    let per = weights.map(w => Math.max(1, Math.round(length * w / total)));
    // תיקון עיגול כדי שיצאו בדיוק length תרגילים
    while (per.reduce((a, b) => a + b, 0) > length) {
      const i = per.indexOf(Math.max(...counts));
      per[i]--;
    }
    while (per.reduce((a, b) => a + b, 0) < length) {
      const i = weights.indexOf(Math.max(...weights.filter((w, j) => per[j] < length)));
      per[i]++;
    }
    const plan = [];
    chosen.forEach((sk, i) => { for (let k = 0; k < per[i]; k++) plan.push({ mode: sk.mode, type: sk.type, label: skillLabel(sk), skill: sk.key }); });
    for (let i = plan.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [plan[i], plan[j]] = [plan[j], plan[i]];
    }
    return plan;
  }

  function startDaily() {
    if (onRhythmPage()) { location.href = PRACTICE_PAGE + '?mode=ear&daily=1'; return; }
    const plan = dailyPlan(20);
    if (!plan) return;
    close();
    window.startDailyMix(plan);
  }

  // תרגול קצב: פותח את דף הקצב על מיומנות הקצב החלשה מבין אלה שנבחרו
  function startRhythm() {
    const s = load();
    const picks = SKILLS.filter(sk => sk.mode === 'rhythm' && s.chosen.includes(sk.key))
      .sort((a, b) => skillStats(s, a.key).score - skillStats(s, b.key).score);
    if (!picks.length) return;
    try {
      const st = JSON.parse(localStorage.getItem('mt_rhythm_settings') || '{}');
      st.kind = picks[0].type;
      localStorage.setItem('mt_rhythm_settings', JSON.stringify(st));
    } catch (e) {}
    if (onRhythmPage()) location.reload();
    else location.href = RHYTHM_PAGE;
  }

  // איפוס כל ההתקדמות (יעד, רצף, מיומנויות ושירים), אחרי אישור
  function askReset() {
    let dlg = document.getElementById('rewardConfirm');
    if (!dlg) {
      dlg = document.createElement('div');
      dlg.id = 'rewardConfirm';
      dlg.className = 'share-dialog rw-dialog rw-confirm';
      document.body.appendChild(dlg);
    }
    dlg.innerHTML = `<div class="share-box reward-box" role="dialog">
      <h3>לאפס את ההתקדמות?</h3>
      <p class="rw-confirm-text">הרצף, הספירה היומית, מדי המיומנויות והשירים שנפתחו יימחקו מהמכשיר הזה, ואי אפשר לבטל. גודל היעד והמיומנויות שבחרת נשארים.</p>
      <div class="share-actions rw-actions">
        <button class="primary" onclick="Rewards.reset()">איפוס</button>
        <button onclick="document.getElementById('rewardConfirm').hidden = true">ביטול</button>
      </div></div>`;
    dlg.hidden = false;
  }
  function reset() {
    const old = load();
    try { localStorage.removeItem(KEY); } catch (e) {}
    // המטרה היומית והמיומנויות שנבחרו הן העדפות, לא התקדמות, ולכן נשארות
    const s = load();
    s.goal = old.goal;
    s.chosen = old.chosen;
    save(s);
    document.getElementById('rewardConfirm').hidden = true;
    renderChip();
    render();
    toast('ההתקדמות אופסה');
  }

  // דף התרגול שנפתח מדף הקצב עם ?daily=1 מתחיל מיד תרגול יומי
  if (/[?&]daily=1/.test(location.search) && window.startDailyMix) {
    setTimeout(() => { if (dailyPlan(20)) startDaily(); }, 300);
  }

  function trainingDone(level, pct) {
    const s = load();
    if (pct >= 85 && !s.passed.includes(level)) s.passed.push(level);
    if (pct === 100) s.perfect = true;
    const fresh = unlockNew(s);
    save(s);
    if (fresh.length) setTimeout(() => showUnlock(fresh), 500);
  }

  // ---------- הכפתור בסרגל העליון ----------
  function renderChip() {
    const el = document.getElementById('rewardChip');
    if (!el) return;
    const s = load();
    const n = s.days[dayKey()] || 0;
    el.querySelector('.chip-num').textContent = `${Math.min(n, s.goal)}/${s.goal}`;
    el.querySelector('.chip-bar > span').style.width = Math.min(100, 100 * n / s.goal) + '%';
    el.classList.toggle('done', n >= s.goal);
  }

  // ---------- דף האוסף ----------
  // הדף מסתיר את כל מה שבמיכל חוץ מהסרגל העליון, הדף עצמו והכותרת התחתונה, ומחזיר כשיוצאים
  let hidden = null;
  function open() {
    const panel = document.getElementById('rewardsPanel');
    if (!hidden) {
      hidden = [];
      [...panel.parentElement.children].forEach(el => {
        if (el === panel || el.classList.contains('topbar') || el.tagName === 'FOOTER') return;
        hidden.push([el, el.style.display]);
        el.style.display = 'none';
      });
    }
    document.body.classList.add('in-rewards');
    panel.style.display = 'block';
    render();
    window.scrollTo(0, 0);
  }
  function close() {
    const panel = document.getElementById('rewardsPanel');
    panel.style.display = 'none';
    document.body.classList.remove('in-rewards');
    playTimers.forEach(clearTimeout);
    if (hidden) hidden.forEach(([el, d]) => { el.style.display = d; });
    hidden = null;
  }
  function setGoal(g) {
    const s = load();
    s.goal = g;
    const today = dayKey();
    if ((s.days[today] || 0) >= g && !s.met.includes(today)) s.met.push(today);
    unlockNew(s);
    save(s);
    renderChip();
    render();
  }

  const DAY_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  function render() {
    const s = load();
    const today = s.days[dayKey()] || 0;
    const st = streak(s);
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      const cls = s.met.includes(k) ? 'met' : (s.days[k] ? 'some' : '');
      week.push(`<div class="wk-day"><span class="wk-box ${cls}"></span><span class="wk-l">${DAY_LETTERS[d.getDay()]}</span></div>`);
    }
    const got = ACHIEVEMENTS.filter(a => s.unlocked[a.id]).length;
    const nMix = SKILLS.filter(sk => sk.mode !== 'rhythm' && s.chosen.includes(sk.key)).length;
    const nRhythm = SKILLS.filter(sk => sk.mode === 'rhythm' && s.chosen.includes(sk.key)).length;
    const cards = ACHIEVEMENTS.map(a => {
      const song = SONGS[a.song];
      if (!s.unlocked[a.id]) {
        return `<div class="song-card locked">${melodySvg(song, { locked: true, bars: 2 })}
          <div class="song-name">שיר נעול</div><div class="song-how">${a.how}</div></div>`;
      }
      return `<button class="song-card" onclick="Rewards.play('${a.song}', this)">${melodySvg(song, { bars: 2 })}
        <div class="song-name">${song.name}</div><div class="song-by">${song.by}</div></button>`;
    }).join('');
    document.getElementById('rewardsPanel').innerHTML = `
      <div class="rw-head"><h2>האוסף שלי</h2><button class="rw-back" onclick="Rewards.close()">חזרה לתרגול</button></div>
      <div class="rw-stats">
        <div><div class="rw-big">${st}</div><div class="rw-label">${st === 1 ? 'יום ברצף' : 'ימים ברצף'}</div></div>
        <div><div class="rw-big">${Math.min(today, s.goal)}<span class="rw-of">/${s.goal}</span></div><div class="rw-label">היום</div></div>
        <div><div class="rw-big">${s.bestRun}</div><div class="rw-label">שיא נכונות ברצף</div></div>
        <div><div class="rw-big">${s.total}</div><div class="rw-label">תרגילים בסך הכול</div></div>
      </div>
      <div class="report-bar rw-today"><span style="width:${Math.min(100, 100 * today / s.goal)}%"></span></div>
      <div class="rw-daily">
        <div class="rw-btns">
          <button class="primary" onclick="Rewards.startDaily()" ${nMix ? '' : 'disabled'}>תרגול יומי</button>
          ${nRhythm ? '<button class="secondary" onclick="Rewards.startRhythm()">תרגול קצב</button>' : ''}
        </div>
        <span>${!s.chosen.length ? 'בוחרים למטה מיומנויות, והתרגול היומי נבנה מהן'
          : nMix ? `20 תרגילים מ-${nMix === 1 ? 'מיומנות הקריאה והשמיעה שבחרת' : nMix + ' מיומנויות הקריאה והשמיעה שבחרת'}, יותר ממה שעוד חלש${nRhythm ? '. הקצב בדף משלו, מתחילים מהחלש' : ''}`
          : 'הקצב מתורגל בדף משלו. כדי לקבל תרגול יומי מעורב בוחרים גם מיומנות קריאה או שמיעה'}</span>
      </div>
      <div class="report-section">
        <h3>המיומנויות שלי</h3>
        <p class="rw-hint">לוחצים על מיומנות כדי לבחור אותה. השליטה נמדדת לפי 20 התשובות האחרונות: מתחיל, בטוח (75% מתוך 10 לפחות), שולט (90% מתוך 20).</p>
        ${['read', 'ear', 'rhythm'].map(mode => `<div class="sk-group"><div class="sk-mode">${MODE_NAME[mode]}</div>${SKILLS.filter(sk => sk.mode === mode).map(sk => {
          const st = skillStats(s, sk.key);
          const on = s.chosen.includes(sk.key);
          return `<button class="sk-row${on ? ' on' : ''}" onclick="Rewards.toggleSkill('${sk.key}')">
            <span class="sk-box"></span><span class="sk-name">${sk.name}</span>
            <span class="sk-meter">${[1, 2, 3].map(l => `<span class="${st.level >= l ? 'f' : ''}"></span>`).join('')}</span>
            <span class="sk-level">${LEVEL_NAMES[st.level]}${st.n ? ` · ${Math.round(100 * st.acc)}%` : ''}</span></button>`;
        }).join('')}</div>`).join('')}
      </div>
      ${hardSection(s)}
      <div class="report-section">
        <h3>השבוע</h3>
        <div class="wk">${week.join('')}</div>
        <div class="rw-goal"><span>יעד יומי</span><div class="seg">${GOALS.map(g => `<button class="${g === s.goal ? 'active' : ''}" onclick="Rewards.setGoal(${g})">${g}</button>`).join('')}</div></div>
        ${s.chosen.length ? '<p class="rw-hint" style="margin-top:10px">ליעד היומי נספרים תרגילים במיומנויות שבחרת, גם בתרגול החופשי.</p>' : ''}
      </div>
      <div class="report-section">
        <h3>שירים ${got} מתוך ${ACHIEVEMENTS.length}</h3>
        <p class="rw-hint">כל הישג פותח שיר קצר. לוחצים על שיר כדי לשמוע אותו.</p>
        <div class="song-grid">${cards}</div>
      </div>
      <div class="rw-reset"><button onclick="Rewards.askReset()">איפוס ההתקדמות</button>
      </div>`;
  }

  // "איפה קשה לי": זוגות שמתבלבלים ביניהם, ופריטים עם הכי מעט תשובות נכונות
  function hardSpots(s) {
    const h = s.hist || [];
    const where = k => { const sk = SKILLS.find(x => x.key === k); return sk ? skillLabel(sk) : ''; };
    const pairs = {};
    h.filter(e => e.c).forEach(e => {
      const two = [e.i, e.c].sort();
      const key = e.k + '|' + two.join('|');
      (pairs[key] = pairs[key] || { k: e.k, a: two[0], b: two[1], n: 0 }).n++;
    });
    const confused = Object.values(pairs).filter(p => p.n >= 2).sort((x, y) => y.n - x.n).slice(0, 3)
      .map(p => ({ text: `${p.a} ו${p.b}`, meta: `${where(p.k)} · ${p.n} בלבולים` }));
    const items = {};
    h.forEach(e => {
      const key = e.k + '|' + e.i;
      const g = items[key] = items[key] || { k: e.k, i: e.i, n: 0, ok: 0 };
      g.n++;
      if (e.ok) g.ok++;
    });
    const weak = Object.values(items).filter(g => g.n >= 4 && g.ok / g.n < 0.75)
      .sort((x, y) => x.ok / x.n - y.ok / y.n).slice(0, 3)
      .map(g => ({ text: g.i, meta: `${where(g.k)} · ${g.ok} מתוך ${g.n} נכונות` }));
    return { confused, weak, total: h.length };
  }
  function hardSection(s) {
    const { confused, weak, total } = hardSpots(s);
    const rows = list => list.map(r => `<div class="hard-row"><span class="hard-name">${r.text}</span><span class="hard-meta">${r.meta}</span></div>`).join('');
    let body;
    if (!confused.length && !weak.length) {
      body = `<p class="rw-hint">${total < 20 ? 'אחרי עוד כמה תרגילים יופיע כאן מה מבלבל אותך ובמה כדאי להתמקד.' : 'כרגע אין משהו שחוזר על עצמו. יפה מאוד.'}</p>`;
    } else {
      body = `<p class="rw-hint">לפי ${total} התרגילים האחרונים, בניסיון הראשון.</p>`
        + (confused.length ? `<div class="hard-sub">מתבלבלים ביניהם</div>${rows(confused)}` : '')
        + (weak.length ? `<div class="hard-sub">הכי מעט תשובות נכונות</div>${rows(weak)}` : '');
    }
    return `<div class="report-section"><h3>איפה קשה לי</h3>${body}</div>`;
  }

  window.Rewards = { hardSpots, solved, broke, toggleSkill, startDaily, startRhythm, askReset, reset, dailyPlan, SKILLS, trainingDone, renderChip, open, close, setGoal, play: playSong, closeUnlock, showUnlock, _celebrate: celebrate, SONGS, ACHIEVEMENTS, _load: load, _save: save, _svg: melodySvg };
  renderChip();
})();
