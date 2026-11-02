// לוגיקת הקצב: משקלים, תאי קצב לפי שלבים, יצירת תיבות, הסחות להכתבה, השלמת תיבה,
// בדיקת הקשות וציור תיווי מדויק על קו אחד (SVG). סקריפט רגיל, window.RhythmCore, וגם מודול ל-node.
(function (root) {
  // ===== משכים =====
  // יחידת זמן: 12 יחידות לרבע, כדי שגם שש-עשריות (3) וגם טריולות של שמיניות (4) יהיו שלמות
  const TPQ = 12;
  const BASE = { w: 48, h: 24, q: 12, '8': 6, '16': 3 };

  // 'q. 8' / 'R8 8' / 'T8 8 8' (T = טריולה)
  function parseCell(str) {
    const triplet = str[0] === 'T';
    const s = triplet ? str.slice(1) : str;
    return s.split(' ').map(tok => {
      const rest = tok[0] === 'R';
      let t = rest ? tok.slice(1) : tok;
      const dots = t.endsWith('.') ? 1 : 0;
      if (dots) t = t.slice(0, -1);
      let ticks = BASE[t] * (dots ? 1.5 : 1);
      if (triplet) ticks = ticks * 2 / 3;
      return { type: t, dots, rest, ticks, tuplet: triplet ? 3 : 0 };
    });
  }

  // ===== משקלים =====
  const METERS = {
    '2/4': { num: 2, den: 4, beats: 2, beatTicks: 12, compound: false },
    '3/4': { num: 3, den: 4, beats: 3, beatTicks: 12, compound: false },
    '4/4': { num: 4, den: 4, beats: 4, beatTicks: 12, compound: false },
    '6/8': { num: 6, den: 8, beats: 2, beatTicks: 18, compound: true },
    '9/8': { num: 9, den: 8, beats: 3, beatTicks: 18, compound: true }
  };

  // ===== שלבים =====
  const LEVELS = [
    { n: 1, name: 'רבעים וחצאים', meters: ['4/4'] },
    { n: 2, name: 'שמיניות', meters: ['2/4', '3/4', '4/4'] },
    { n: 3, name: 'נקודה והפסקות', meters: ['2/4', '3/4', '4/4'] },
    { n: 4, name: 'שש-עשריות', meters: ['2/4', '3/4', '4/4'] },
    { n: 5, name: 'סינקופות וטריולות', meters: ['2/4', '3/4', '4/4'] },
    { n: 6, name: 'משקל מורכב', meters: ['6/8', '9/8'] }
  ];

  // תאי קצב: כל תא ממלא פעמה אחת או יותר. level = השלב שבו התא נכנס
  const SIMPLE_CELLS = [
    ['q', 1], ['h', 1], ['w', 1],
    ['8 8', 2],
    ['q. 8', 3], ['h.', 3], ['Rq', 3], ['R8 8', 3], ['8 R8', 3], ['Rh', 3],
    ['16 16 16 16', 4], ['8 16 16', 4], ['16 16 8', 4],
    ['8. 16', 5], ['16 8 16', 5], ['8 q 8', 5], ['T8 8 8', 5]
  ];
  const COMPOUND_CELLS = [
    ['q.', 6], ['8 8 8', 6], ['q 8', 6], ['8 q', 6], ['h.', 6], ['Rq.', 6], ['q R8', 6],
    ['16 16 8 8', 6], ['8. 16 8', 6]
  ];

  function makeCell(str, level, meter) {
    const events = parseCell(str);
    const ticks = events.reduce((a, e) => a + e.ticks, 0);
    return { str, level, events, ticks, beats: ticks / METERS[meter].beatTicks };
  }

  function cellsFor(meter, level) {
    const m = METERS[meter];
    const list = m.compound ? COMPOUND_CELLS : SIMPLE_CELLS;
    return list.filter(([, l]) => l <= level).map(([s, l]) => makeCell(s, l, meter))
      .filter(c => Number.isInteger(c.beats) && c.beats <= m.beats);
  }

  // איפה בתיבה מותר לתא להתחיל, כדי שהכתיבה תראה את הפעמות (כמו שכותבים באמת)
  function allowedStart(meter, cell, start) {
    const m = METERS[meter];
    const len = cell.beats;
    if (start + len > m.beats) return false;
    if (len === 1) return true;
    if (meter === '4/4') {
      if (len === 2) return start % 2 === 0;
      return start === 0;
    }
    if (meter === '3/4') {
      if (cell.str === 'Rh') return false; // בשלושה רבעים כותבים שתי הפסקות רבע
      if (len === 2) return start <= 1;
      return start === 0;
    }
    if (meter === '9/8') return len === 2 ? start <= 1 : start === 0;
    return start === 0;
  }

  function cellWeight(cell, level) {
    let w = cell.level === level ? 3 : 1;
    if (cell.str === 'w') w = 0.4;
    if (cell.events.some(e => e.rest)) w *= 0.6;
    if (cell.events.every(e => e.rest)) w *= 0.6;
    return w;
  }

  function pick(list, weights, rnd) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rnd() * total;
    for (let i = 0; i < list.length; i++) { r -= weights[i]; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }

  // ממלא פעמות [from, to) בתיבה בתאים אקראיים
  function fillSpan(meter, level, from, to, rnd) {
    const cells = cellsFor(meter, level);
    const out = [];
    let pos = from;
    while (pos < to) {
      const ok = cells.filter(c => pos + c.beats <= to && allowedStart(meter, c, pos));
      const c = pick(ok, ok.map(c => cellWeight(c, level)), rnd);
      out.push(Object.assign({}, c, { start: pos }));
      pos += c.beats;
    }
    return out;
  }

  function restCells(bar) { return bar.filter(c => c.events.every(e => e.rest)).length; }

  // events בסדר, עם זמן התחלה ביחידות (מתחילת התרגיל)
  function flatten(ex) {
    const out = [];
    const barTicks = METERS[ex.meter].beats * METERS[ex.meter].beatTicks;
    ex.bars.forEach((bar, b) => {
      let t = b * barTicks;
      bar.forEach((cell, ci) => cell.events.forEach((e, ei) => {
        out.push(Object.assign({}, e, { at: t, bar: b, cell: ci, ev: ei }));
        t += e.ticks;
      }));
    });
    return out;
  }

  function onsets(ex) {
    return flatten(ex).filter(e => !e.rest).map(e => e.at);
  }
  function signature(ex) { return onsets(ex).join(','); }
  function writtenKey(ex) { return ex.bars.map(b => b.map(c => c.str).join('|')).join('||'); }

  function barsFor(meter, kind) {
    if (kind === 'tap') return METERS[meter].beats <= 2 ? 4 : 2;
    return METERS[meter].beats <= 2 ? 2 : 1;
  }

  // תרגיל חדש: משקל מהשלב, תיבות, ולפחות תא אחד מהשלב עצמו
  function generate(level, kind, rnd, meter) {
    rnd = rnd || Math.random;
    const L = LEVELS[level - 1];
    meter = meter || L.meters[Math.floor(rnd() * L.meters.length)];
    const nBars = barsFor(meter, kind);
    let best = null;
    for (let tries = 0; tries < 60; tries++) {
      const bars = [];
      for (let b = 0; b < nBars; b++) bars.push(fillSpan(meter, level, 0, METERS[meter].beats, rnd));
      const ex = { meter, level, bars };
      const notes = onsets(ex).length;
      if (notes < 2 + nBars) continue;
      if (bars.some(b => restCells(b) > 1)) continue;
      if (bars.some(b => b.length === 1 && b[0].str === 'w') && rnd() < 0.7) continue;
      best = ex;
      const hasNew = bars.some(b => b.some(c => c.level === level));
      if (hasNew || level === 1) break;
    }
    return best || { meter, level, bars: Array.from({ length: nBars }, () => fillSpan(meter, level, 0, METERS[meter].beats, rnd)) };
  }

  // גרסה דומה עם שינוי קטן (תא אחד או שניים), שנשמעת אחרת
  function variant(ex, rnd, avoid) {
    rnd = rnd || Math.random;
    for (let tries = 0; tries < 80; tries++) {
      const b = Math.floor(rnd() * ex.bars.length);
      const bar = ex.bars[b];
      const i = Math.floor(rnd() * bar.length);
      let j = i;
      if (rnd() < 0.4 && j + 1 < bar.length) j++;
      const from = bar[i].start, to = bar[j].start + bar[j].beats;
      const repl = fillSpan(ex.meter, ex.level, from, to, rnd);
      const nb = bar.slice(0, i).concat(repl, bar.slice(j + 1));
      if (restCells(nb) > 1) continue;
      const v = { meter: ex.meter, level: ex.level, bars: ex.bars.map((x, k) => k === b ? nb : x) };
      const sig = signature(v);
      if (onsets(v).length < 2) continue;
      if (avoid.some(a => signature(a) === sig)) continue;
      return v;
    }
    return null;
  }

  // ארבע אפשרויות להכתבה: התשובה ועוד שלוש שנשמעות אחרת
  function dictation(level, rnd) {
    rnd = rnd || Math.random;
    for (let tries = 0; tries < 20; tries++) {
      const ex = generate(level, 'dictation', rnd);
      const opts = [ex];
      let guard = 0;
      while (opts.length < 4 && guard++ < 30) {
        const base = rnd() < 0.75 ? ex : opts[Math.floor(rnd() * opts.length)];
        const v = variant(base, rnd, opts);
        if (v) opts.push(v);
      }
      if (opts.length < 4) continue;
      const order = opts.map((o, k) => ({ o, k, r: rnd() })).sort((a, b) => a.r - b.r);
      return { answer: ex, options: order.map(x => x.o), correct: order.findIndex(x => x.k === 0) };
    }
    return null;
  }

  // ===== השלמת תיבה =====
  const NOTE_POOL = ['w', 'h.', 'h', 'q.', 'q', '8.', '8', '16'];
  const REST_POOL = ['Rh', 'Rq.', 'Rq', 'R8', 'R16'];
  function symbolTicks(sym) { return parseCell(sym)[0].ticks; }
  function eventSymbol(e) { return (e.rest ? 'R' : '') + e.type + (e.dots ? '.' : ''); }

  // סימן אחד חסר בתיבה. מחפשים סימן שאינו מחובר בקורה ואינו טריולה
  function completion(level, rnd) {
    rnd = rnd || Math.random;
    for (let tries = 0; tries < 60; tries++) {
      const ex = generate(level, 'complete', rnd);
      const evs = flatten(ex).filter(e => e.tuplet === 0 && !isBeamed(ex, e));
      if (evs.length === 0 || flatten(ex).length < 3) continue;
      const missing = evs[Math.floor(rnd() * evs.length)];
      const sym = eventSymbol(missing);
      const pool = (missing.rest ? REST_POOL : NOTE_POOL).filter(s => s !== sym);
      const target = missing.ticks;
      const near = pool.map(s => ({ s, d: Math.abs(Math.log2(symbolTicks(s) / target)) + rnd() * 0.6 }))
        .sort((a, b) => a.d - b.d).slice(0, 3).map(x => x.s);
      const opts = [sym].concat(near).map(s => ({ s, r: rnd() })).sort((a, b) => a.r - b.r).map(x => x.s);
      return { ex, missing: { bar: missing.bar, cell: missing.cell, ev: missing.ev }, answer: sym, options: opts, correct: opts.indexOf(sym) };
    }
    return null;
  }

  // ===== קורות =====
  function beamable(e) { return !e.rest && (e.type === '8' || e.type === '16'); }
  // בתוך תא, תווים קצרים צמודים מחוברים בקורה
  function beamGroups(cell) {
    const groups = [];
    let cur = [];
    cell.events.forEach((e, i) => {
      if (beamable(e)) cur.push(i);
      else { if (cur.length > 1) groups.push(cur); cur = []; }
    });
    if (cur.length > 1) groups.push(cur);
    return groups;
  }
  function isBeamed(ex, e) {
    const cell = ex.bars[e.bar][e.cell];
    return beamGroups(cell).some(g => g.includes(e.ev));
  }

  // ===== השמעה =====
  // זמני התווים בשניות; tempo = פעמות לדקה (בשש-שמיניות הפעמה היא רבע מנוקד)
  function timeline(ex, tempo) {
    const m = METERS[ex.meter];
    const sec = 60 / tempo / m.beatTicks;
    return flatten(ex).map(e => ({ rest: e.rest, start: e.at * sec, dur: e.ticks * sec }));
  }
  function barSeconds(ex, tempo) { return METERS[ex.meter].beats * 60 / tempo; }

  // ===== בדיקת הקשות =====
  // expected: זמני התווים, taps: זמני ההקשות (שניות, אותו שעון)
  // מחזיר לכל תו את הסטייה (שלילי = מוקדם) או null אם לא הוקש, ואת מספר ההקשות המיותרות
  // expected: זמני התווים, taps: זמני ההקשות (שניות, אותו שעון)
  // הבדיקה סלחנית: "בזמן" = עד כחמישית פעמה (לפחות 0.14 שנ׳), הקשה כפולה מהירה נספרת כאחת,
  // ועיכוב קבוע (מסך מגע, רמקול בלוטות׳) עד 0.15 שנ׳ מקוזז.
  // מחזיר לכל תו את הסטייה (שלילי = מוקדם) או null אם לא הוקש, ואת מספר ההקשות המיותרות
  function scoreTaps(expected, taps, opts) {
    opts = opts || {};
    const beat = opts.beat || 0.75;
    const good = opts.good || Math.min(0.2, Math.max(0.14, beat * 0.2));
    const n = expected.length;
    const win = expected.map((t, i) => {
      const prev = i > 0 ? t - expected[i - 1] : Infinity;
      const next = i < n - 1 ? expected[i + 1] - t : Infinity;
      return Math.min(0.4, 0.6 * Math.min(prev, next));
    });
    const sorted = taps.slice().sort((a, b) => a - b).filter((t, i, arr) => i === 0 || t - arr[i - 1] > 0.06);

    function match(shift) {
      const errors = new Array(n).fill(null);
      let extra = 0;
      sorted.forEach(raw => {
        const tap = raw - shift;
        let bestI = -1, bestD = Infinity;
        for (let i = 0; i < n; i++) {
          if (errors[i] !== null) continue;
          const d = Math.abs(tap - expected[i]);
          if (d <= win[i] && d < bestD) { bestD = d; bestI = i; }
        }
        if (bestI >= 0) errors[bestI] = tap - expected[bestI];
        else extra++;
      });
      return { errors, extra };
    }

    // עיכוב קבוע של המכשיר: בודקים הזזות של עד 0.15 שנ׳ ובוחרים את זו שמתאימה הכי טוב.
    // בשוויון מעדיפים הזזה קטנה, כך שתלמיד שמקיש בזמן לא "מתוקן"
    const score = mm => mm.errors.filter(e => e !== null && Math.abs(e) <= good).length * 2
      - mm.errors.filter(e => e === null).length - mm.extra;
    let offset = 0;
    let m = match(0);
    let best = score(m);
    for (let k = -15; k <= 15; k++) {
      const shift = k / 100;
      if (!k) continue;
      const mm = match(shift);
      const sc = score(mm) - Math.abs(shift) * 2; // עונש קטן על הזזה
      if (sc > best + 1e-9) { best = sc; m = mm; offset = shift; }
    }
    // הזזה מתקבלת רק כשהיא מתקנת כמה תווים יחד (עיכוב קבוע), לא תו בודד שאיחר
    if (offset && best - score(match(0)) < 3.5) { offset = 0; m = match(0); }
    const { errors, extra } = m;
    const onTime = errors.filter(e => e !== null && Math.abs(e) <= good).length;
    const early = errors.filter(e => e !== null && e < -good).length;
    const late = errors.filter(e => e !== null && e > good).length;
    const missed = errors.filter(e => e === null).length;
    // עובר: כל התווים הוקשו, בלי הקשות מיותרות, ולכל היותר תו אחד מכל עשרה לא בזמן
    const passed = missed === 0 && extra === 0 && onTime >= n - Math.floor(n / 10);
    return { errors, extra, onTime, early, late, missed, passed, perfect: onTime === n && extra === 0, good, offset };
  }

  // ===== ספירה =====
  // הברות קונוקול לכל פעמה, לפי החלוקה הדקה ביותר שיש בה:
  // פעמה שלמה ta, לשניים ta ka, לשלושה ta ki ta, לארבעה ta ka di mi.
  // במשקל מורכב הפעמה מתחלקת לשלוש שמיניות (ta ki ta), ועם שש-עשריות לשש (ta ka di mi ta ka).
  // הפסקות לא מקבלות הברה. events: [{ at (בתוך התיבה), rest, tuplet }]
  const SYLLABLES = { 1: ['ta'], 2: ['ta', 'ka'], 3: ['ta', 'ki', 'ta'], 4: ['ta', 'ka', 'di', 'mi'], 6: ['ta', 'ka', 'di', 'mi', 'ta', 'ka'] };
  function countLabels(meter, events) {
    const m = METERS[meter];
    const bt = m.beatTicks;
    const grids = {};
    events.forEach(e => {
      const beat = Math.floor(e.at / bt);
      const f = e.at % bt;
      let g = 1;
      if (m.compound) g = f === 0 ? 1 : f % 6 === 0 ? 3 : 6;
      else if (e.tuplet || f % 4 === 0 && f % 12 !== 0 && f % 6 !== 0) g = f === 0 ? 1 : 3;
      else g = f === 0 ? 1 : f % 6 === 0 ? 2 : 4;
      if (e.tuplet && !m.compound) g = Math.max(g, 3);
      // טריולה ושש-עשריות לא נפגשות באותה פעמה בתרגילים, אז הגדול קובע
      grids[beat] = Math.max(grids[beat] || 1, g);
    });
    return events.map(e => {
      if (e.rest) return '';
      const beat = Math.floor(e.at / bt);
      const g = grids[beat];
      const idx = Math.round((e.at % bt) / (bt / g));
      return SYLLABLES[g][idx] || '';
    });
  }

  // ===== ציור =====
  // צורות מתוך הגופן Bravura (SIL Open Font License, Steinberg Media Technologies).
  // 250 יחידות = רווח אחד. b = גבולות הצורה [x0, y0, x1, y1]
  const GLYPHS = {
    noteheadWhole: { w: 422, b: [0,-125,422,125], d: 'M216 125C83 125 0 70 0 2C0 -65 57 -125 206 -125C370 -125 422 -68 422 2C422 73 309 125 216 125ZM111 63C122 98 159 103 190 103C259 103 314 29 314 -31C314 -38 313 -44 312 -50C307 -75 293 -92 268 -98C258 -101 247 -102 237 -102C228 -102 220 -101 211 -98C194 -93 178 -84 164 -72C156 -65 149 -58 143 -50C123 -27 108 7 108 39C108 47 109 55 111 63Z' },
    noteheadHalf: { w: 295, b: [0,-125,295,125], d: 'M97 -125C262 -125 295 9 295 42C295 93 254 125 196 125C47 125 0 10 0 -42C0 -95 42 -125 97 -125ZM173 -46C128 -76 97 -87 75 -87C54 -87 42 -76 35 -64C32 -58 29 -51 29 -44C29 -22 51 5 120 45C170 74 201 84 221 84C240 84 251 75 258 63C261 57 264 51 264 44C264 24 243 0 173 -46Z' },
    noteheadBlack: { w: 295, b: [0,-125,295,125], d: 'M97 -125C186 -125 295 -43 295 42C295 93 255 125 198 125C88 125 0 44 0 -42C0 -94 43 -125 97 -125Z' },
    augmentationDot: { w: 100, b: [0,-50,100,50], d: 'M100 0C100 28 78 50 50 50C22 50 0 28 0 0C0 -28 22 -50 50 -50C78 -50 100 -28 100 0Z' },
    restWhole: { w: 283, b: [0,-135,282,9], d: 'M282 -109V-17C282 -2 270 9 256 9H26C11 9 0 -2 0 -17V-109C0 -123 11 -135 26 -135H256C270 -135 282 -123 282 -109Z' },
    restHalf: { w: 283, b: [0,-2,282,142], d: 'M282 24V116C282 131 270 142 256 142H26C11 142 0 131 0 116V24C0 10 11 -2 26 -2H256C270 -2 282 10 282 24Z' },
    restQuarter: { w: 270, b: [1,-375,270,373], d: 'M78 -38C94 -58 108 -77 121 -98C123 -102 127 -110 127 -112C127 -113 127 -115 126 -116C124 -120 120 -121 115 -121C111 -121 103 -119 99 -118C94 -118 88 -115 83 -115C40 -115 1 -158 1 -211C1 -261 44 -310 117 -366C125 -372 135 -375 143 -375C150 -375 157 -373 158 -369C159 -366 160 -364 160 -362C160 -353 152 -345 144 -338C131 -338 120 -311 118 -302C115 -294 114 -285 114 -276C114 -245 129 -210 161 -204C166 -203 171 -203 177 -203C206 -203 239 -214 255 -220C256 -220 257 -221 258 -221C261 -222 263 -222 265 -222C268 -222 270 -221 270 -218C270 -206 244 -173 233 -161C195 -115 164 -78 164 -22C164 -18 165 -13 165 -9C169 49 205 97 231 138C234 143 235 148 235 153C235 163 231 172 231 172C231 172 83 348 66 365C61 370 54 373 48 373C38 373 28 366 28 352C28 347 29 342 32 336C36 325 93 274 93 202C93 165 78 122 33 75C23 65 19 54 19 46C19 32 29 22 29 22Z' },
    rest8th: { w: 250, b: [0,-251,247,174], d: 'M134 107C134 144 104 174 67 174C30 174 0 144 0 107C0 86 12 68 27 56C36 50 45 45 55 43C63 41 72 39 81 39C95 39 109 42 120 46C134 50 143 54 156 61C158 62 160 62 161 62C165 62 166 58 166 53C166 50 166 46 165 42C162 27 90 -172 72 -238C72 -250 95 -251 101 -251C112 -251 126 -249 136 -241C139 -239 237 112 237 112C241 130 246 146 247 151C247 161 237 166 235 167C233 167 230 167 224 163C217 157 167 97 134 97Z' },
    rest16th: { w: 320, b: [0,-500,320,179], d: 'M208 111C208 149 178 179 140 179C103 179 72 149 72 111C72 91 84 72 100 60C108 54 118 49 128 46C135 44 143 43 152 43C166 43 182 46 194 50C208 54 217 58 230 65C233 66 235 67 237 67C240 67 242 65 242 60C242 57 241 52 239 45C237 37 193 -101 184 -120C176 -139 149 -151 135 -151C136 -147 136 -144 136 -141C136 -103 105 -73 68 -73C30 -73 0 -103 0 -141C0 -161 12 -180 28 -192C36 -198 45 -203 55 -206C63 -208 71 -209 80 -209C94 -209 110 -206 122 -202C136 -198 142 -195 155 -188C157 -188 159 -190 159 -193C159 -194 158 -195 158 -196L63 -479C63 -480 62 -481 62 -482C62 -490 71 -500 93 -500C122 -500 127 -488 131 -477L247 -96C273 -11 292 56 292 56C292 56 317 144 319 157C319 159 320 160 320 161C320 167 312 171 310 172C305 172 302 170 299 168C292 162 242 102 208 101Z' },
    flag8thUp: { w: 264, b: [0,-810,264,9], d: 'M238 -790C238 -790 264 -695 264 -617C264 -492 212 -374 149 -274C98 -195 56 -109 40 -13C37 3 29 9 19 9C8 9 0 6 0 -6V-245C66 -257 161 -393 197 -478C212 -512 221 -569 221 -628C221 -673 214 -720 197 -765C195 -771 194 -776 194 -780C194 -796 204 -805 210 -809C211 -810 213 -810 215 -810C222 -810 234 -804 238 -790Z' },
    flag16thUp: { w: 279, b: [0,-813,279,2], d: 'M272 -796C276 -791 279 -734 279 -686V-664C279 -622 268 -581 250 -544C250 -541 249 -539 249 -535C249 -533 249 -531 250 -528C253 -522 275 -462 275 -401C275 -388 274 -377 272 -365C262 -297 236 -269 164 -191C110 -133 54 -117 37 -11C35 0 23 2 17 2C11 2 0 -1 0 -8V-396H5C67 -398 138 -400 207 -540C230 -588 239 -637 239 -689C239 -718 236 -748 231 -778C230 -782 230 -784 230 -787C230 -801 237 -809 244 -811C247 -812 249 -813 252 -813C259 -813 266 -809 272 -796ZM209 -459C193 -434 176 -414 155 -390C108 -336 62 -312 41 -230C40 -229 40 -228 40 -227C40 -223 46 -217 54 -217H62C123 -217 177 -273 210 -322C228 -348 237 -379 237 -411C237 -418 237 -424 236 -431C234 -439 234 -449 229 -457C228 -460 221 -463 216 -463C213 -463 211 -462 209 -459Z' },
    tuplet3: { w: 296, b: [10,-8,306,375], d: 'M122 207C109 207 102 201 102 192C102 183 109 177 122 177H132C169 177 187 155 187 123C187 79 156 18 95 18C75 18 59 26 59 36C59 42 64 44 72 48C83 53 97 65 97 91C97 115 80 127 59 127C31 127 10 102 10 69C10 29 42 -8 113 -8C198 -8 268 43 268 122C268 147 255 171 229 184C222 187 218 188 218 193C218 196 222 198 230 202C272 219 306 251 306 291C306 343 256 375 195 375C132 375 80 342 78 288V286C78 261 94 245 116 245C141 245 161 265 161 292C161 303 157 311 152 317C145 323 140 327 140 330C140 337 152 344 173 344C212 344 225 320 225 298C225 245 191 207 133 207Z' },
    timeSig0: { w: 470, b: [20,-250,450,251], d: 'M450 0C450 139 354 251 235 251C116 251 20 139 20 0C20 -138 116 -250 235 -250C354 -250 450 -138 450 0ZM235 220C276 220 310 125 310 7C310 -110 276 -205 235 -205C193 -205 160 -110 160 7C160 125 193 220 235 220Z' },
    timeSig1: { w: 334, b: [20,-250,314,251], d: 'M24 13C24 13 20 7 20 0C20 -5 23 -11 31 -14C35 -15 39 -16 40 -16C50 -16 54 -7 54 -7C54 -7 97 62 108 81C112 88 116 91 118 91C122 91 124 83 124 77V-181C124 -204 101 -219 80 -219C73 -219 63 -222 63 -234C63 -245 72 -250 85 -250H298C314 -250 314 -234 314 -234C314 -234 314 -219 299 -219C285 -219 267 -201 267 -184V228C267 244 261 250 247 251C233 251 208 247 195 247C176 247 158 248 143 250C141 250 139 251 138 251C128 251 124 241 120 232Z' },
    timeSig2: { w: 446, b: [20,-257,426,254], d: 'M421 -91C421 -79 416 -77 409 -77C401 -77 398 -81 396 -87C396 -88 395 -89 395 -90C385 -114 377 -133 356 -133C351 -133 346 -132 339 -130C326 -125 319 -124 309 -119C289 -111 242 -95 201 -95C188 -95 175 -97 164 -101C186 -65 271 -35 293 -29C308 -25 350 -17 383 10C407 29 426 58 426 102C426 149 406 183 380 205C329 248 251 254 229 254C202 254 168 253 142 247C107 240 72 219 48 191C31 170 20 145 20 118C20 104 23 90 29 75C44 44 75 20 111 20C172 20 181 83 181 108C181 168 112 171 112 191C114 205 132 229 191 229C280 229 281 162 281 133C281 95 269 60 247 31C211 -17 183 -41 134 -71C79 -106 40 -155 23 -218C23 -220 22 -222 22 -224C22 -235 29 -248 40 -255C43 -257 46 -257 48 -257C70 -257 82 -196 141 -196C181 -196 196 -250 285 -250C328 -250 405 -246 421 -91Z' },
    timeSig3: { w: 421, b: [20,-251,401,249], d: 'M213 248C208 248 203 249 198 249C112 249 26 192 26 139C26 106 45 62 107 58H112C156 58 178 90 178 123V131C175 168 150 170 145 172C140 174 125 172 125 186V190C127 207 158 215 167 215C252 215 260 162 260 138V131C260 57 201 28 138 25C128 24 114 19 114 8C114 -4 131 -4 139 -4C254 -4 263 -82 263 -95C263 -201 209 -213 187 -213C183 -213 179 -212 178 -212C170 -211 151 -211 150 -196V-191C150 -169 172 -154 173 -125C173 -115 172 -104 168 -94C157 -69 128 -53 101 -53C97 -53 94 -53 90 -54C73 -57 54 -67 42 -80C25 -95 20 -119 20 -141C22 -219 93 -249 191 -251H200C299 -251 401 -200 401 -112V-105C400 -91 398 -77 392 -64C388 -54 381 -44 373 -35C367 -27 359 -20 349 -14L328 -2L295 7C290 8 287 8 285 12C284 14 284 15 284 17C284 21 285 25 288 26C299 29 310 30 319 35C334 42 347 49 358 62C374 80 380 103 380 126C380 218 255 245 213 248Z' },
    timeSig4: { w: 470, b: [20,-250,450,251], d: 'M362 -74V140C362 148 361 157 350 157C341 157 336 155 330 148L235 33C231 28 226 22 226 10V-74H91C171 -6 331 221 334 232C334 234 335 235 335 237C335 245 328 251 320 251C311 251 270 249 252 249C234 249 189 251 181 251C172 251 158 248 158 232C158 108 60 -31 30 -73L24 -81C24 -82 23 -83 23 -84C21 -88 20 -92 20 -95C20 -105 28 -112 40 -112H226V-175C226 -202 204 -210 186 -210C170 -210 163 -219 163 -229C163 -239 167 -250 182 -250H395C405 -250 415 -243 415 -229C415 -215 403 -209 393 -209C383 -209 362 -203 362 -171V-112H435C445 -112 450 -105 450 -93C450 -81 446 -74 435 -74Z' },
    timeSig5: { w: 403, b: [20,-251,383,246], d: 'M76 59C76 59 80 115 81 124C82 132 87 137 96 137H100C110 135 157 128 198 128C337 128 342 208 342 224C342 237 339 245 328 245C315 245 237 236 205 236C173 236 87 244 70 246C52 246 47 237 46 229L35 7V5C35 -8 45 -10 55 -10C65 -10 66 -1 77 10C87 20 111 43 145 43C179 43 248 24 248 -87C248 -197 189 -211 163 -211C155 -211 147 -211 140 -208C135 -205 129 -201 128 -194C128 -187 135 -183 140 -180C163 -166 178 -141 178 -113C178 -69 143 -35 100 -35C46 -35 24 -74 21 -109C20 -115 20 -121 20 -127C20 -210 74 -251 197 -251C317 -251 383 -177 383 -87C383 4 309 78 218 78C160 78 117 68 85 49C83 48 81 48 80 48C76 48 76 52 76 55Z' },
    timeSig6: { w: 434, b: [20,-249,414,251], d: 'M260 100C272 88 289 83 305 83C313 83 322 85 330 87C361 95 385 127 385 159C385 163 385 166 384 170C379 203 351 227 321 238C297 248 268 251 242 251C166 250 95 213 59 145C37 103 20 50 20 3V-1C21 -47 29 -99 51 -139C72 -177 106 -218 145 -235C170 -246 200 -249 225 -249C270 -249 320 -242 356 -213C391 -185 414 -140 414 -95C414 -39 384 -5 352 19C325 39 294 50 263 50C231 50 198 38 172 15C170 13 168 13 166 13C160 13 157 21 157 37C160 222 219 227 240 227C260 227 273 222 273 212C273 198 254 186 248 174C243 165 241 155 241 145C241 130 246 115 256 104C257 102 259 101 260 100ZM222 2C254 2 281 -48 281 -110C281 -172 254 -222 222 -222C190 -222 164 -172 164 -110C164 -48 190 2 222 2Z' },
    timeSig7: { w: 441, b: [20,-250,421,249], d: 'M421 204C421 231 421 244 404 244C403 244 387 240 383 233C376 221 362 164 337 164C312 164 265 249 182 249C124 249 109 226 95 213C81 200 75 196 68 195C60 195 47 209 42 219C40 223 35 226 30 226C25 226 20 223 20 214V49C20 49 21 33 31 33C39 33 42 42 46 53C56 78 69 136 114 136C154 136 202 61 260 61C288 61 302 76 310 82C313 84 317 86 319 86C323 86 325 83 326 77C326 49 249 -7 189 -78C151 -122 120 -180 120 -219C120 -240 120 -250 139 -250C157 -250 179 -241 204 -241C229 -241 276 -250 286 -250C296 -250 302 -242 302 -213C302 -46 421 97 421 200Z' },
    timeSig8: { w: 436, b: [20,-259,416,259], d: 'M334 36C370 59 394 92 394 142C394 244 247 259 220 259C104 259 25 206 25 122C25 53 64 16 112 -11C60 -36 20 -69 20 -132C20 -219 110 -259 209 -259C309 -259 416 -216 416 -81C416 -21 381 12 334 36ZM282 59C202 87 117 104 117 167C117 209 174 230 218 230C250 230 335 214 335 144C335 104 315 78 282 59ZM205 -226C138 -226 77 -192 77 -127C77 -87 112 -50 156 -33C229 -65 303 -86 303 -152C303 -192 272 -226 205 -226Z' },
    timeSig9: { w: 434, b: [20,-249,414,251], d: 'M174 -98C162 -86 145 -81 129 -81C121 -81 112 -83 104 -85C73 -93 49 -125 49 -157C49 -161 49 -164 50 -168C55 -201 83 -225 113 -236C137 -246 166 -249 192 -249C268 -248 339 -211 375 -143C397 -101 414 -48 414 -1V3C413 49 405 101 383 141C362 179 328 220 289 237C264 248 234 251 209 251C164 251 114 244 78 215C43 187 20 142 20 97C20 41 50 7 82 -17C109 -37 140 -48 171 -48C203 -48 236 -36 262 -13C264 -11 266 -11 268 -11C274 -11 277 -19 277 -35C274 -220 215 -225 194 -225C174 -225 161 -220 161 -210C161 -196 180 -184 186 -172C191 -163 193 -153 193 -143C193 -128 188 -113 178 -102C177 -100 175 -99 174 -98ZM212 0C180 0 153 50 153 112C153 174 180 224 212 224C244 224 270 174 270 112C270 50 244 0 212 0Z' }
  };

  function glyph(name, x, y, sp, fill) {
    const s = (sp / 250).toFixed(5);
    return `<path d="${GLYPHS[name].d}" transform="translate(${r(x)} ${r(y)}) scale(${s} -${s})"${fill ? ` fill="${fill}"` : ''}/>`;
  }
  function gw(name, sp) { return GLYPHS[name].w * sp / 250; }
  function r(v) { return Math.round(v * 100) / 100; }

  const HEAD = { w: 'noteheadWhole', h: 'noteheadHalf', q: 'noteheadBlack', '8': 'noteheadBlack', '16': 'noteheadBlack' };
  const REST = { w: 'restWhole', h: 'restHalf', q: 'restQuarter', '8': 'rest8th', '16': 'rest16th' };

  // רוחב שתופס סימן לפי המשך שלו (כמו בדפוס: משך כפול = קצת יותר מקום, לא כפול)
  function advance(e, sp) {
    const base = e.tuplet ? e.ticks * 1.5 : e.ticks;
    return sp * (2.4 + 1.5 * Math.log2(base / 3 + 1)) + (e.dots ? sp * (e.type === '8' || e.type === '16' ? 1.6 : 0.9) : 0);
  }

  // ex: התרגיל. opts: { sp, missing, marks: [{x?, err, good}], ink, faint }
  // מחזיר { svg, width, height, notes: [{x}] } — notes = התווים המושמעים, לפי הסדר
  function render(ex, opts) {
    opts = opts || {};
    const sp = opts.sp || 10;
    const ink = opts.ink || 'currentColor';
    const faint = opts.faint || '#bbbbbb';
    const lineCol = opts.line || '#8c8c8c';
    const m = METERS[ex.meter];
    const y = sp * 5.5; // הקו
    const stemLen = sp * 3.5;
    const stemW = sp * 0.12;
    let svg = '';
    let x = sp * 0.6;
    const notes = [];
    const noteStyle = opts.noteStyle || [];

    // משקל
    if (opts.timeSig !== false) {
      const tw = Math.max(...[String(m.num), String(m.den)].map(s => [...s].reduce((a, ch) => a + gw('timeSig' + ch, sp), 0)));
      [[String(m.num), y - sp], [String(m.den), y + sp]].forEach(([s, yy]) => {
        const w = [...s].reduce((a, ch) => a + gw('timeSig' + ch, sp), 0);
        let xx = x + (tw - w) / 2;
        [...s].forEach(ch => { svg += glyph('timeSig' + ch, xx, yy, sp, ink); xx += gw('timeSig' + ch, sp); });
      });
      x += tw + sp * 1.6;
    }
    const startX = x;
    let noteIdx = 0;
    const evList = []; // כל הסימנים: מיקום, רוחב וזמן בתוך התיבה (לספירה ולמספרי הפעמות)

    ex.bars.forEach((bar, b) => {
      const barStart = x;
      let tIn = 0;
      const isWholeRest = bar.length === 1 && bar[0].events.length === 1 && bar[0].events[0].rest && bar[0].ticks === m.beats * m.beatTicks;
      bar.forEach((cell, ci) => {
        const groups = beamGroups(cell);
        const pos = []; // לכל סימן: x של ראש התו, וקצה הגבעול
        cell.events.forEach((e, ei) => {
          const isMissing = opts.missing && opts.missing.bar === b && opts.missing.cell === ci && opts.missing.ev === ei;
          const adv = advance(e, sp) * (opts.spread || 1);
          evList.push({ x, adv, at: tIn, ticks: e.ticks, e, bar: b, barStart });
          tIn += e.ticks;
          if (isMissing) {
            const w = Math.max(adv - sp * 0.8, sp * 2.4);
            svg += `<rect x="${r(x - sp * 0.3)}" y="${r(y - sp * 2.2)}" width="${r(w)}" height="${r(sp * 4.4)}" rx="${r(sp * 0.4)}" fill="none" stroke="${faint}" stroke-width="${r(sp * 0.12)}" stroke-dasharray="${r(sp * 0.45)} ${r(sp * 0.35)}"/>`;
            svg += `<text x="${r(x - sp * 0.3 + w / 2)}" y="${r(y + sp * 0.55)}" text-anchor="middle" font-family="Assistant, sans-serif" font-size="${r(sp * 1.8)}" fill="${faint}">?</text>`;
            pos.push(null);
            if (!e.rest) noteIdx++;
            x += adv;
            return;
          }
          if (e.rest) {
            const name = REST[e.type];
            let rx = x;
            if (isWholeRest) rx = barStart + (adv - gw(name, sp)) / 2;
            svg += glyph(name, rx, y, sp, ink);
            if (e.dots) svg += glyph('augmentationDot', rx + gw(name, sp) + sp * 0.35, y - sp * 0.5, sp, ink);
            pos.push(null);
          } else {
            const st = noteStyle[noteIdx] || {};
            const col = st.color || ink;
            const head = HEAD[e.type];
            svg += glyph(head, x, y, sp, col);
            const hw = gw(head, sp);
            // בתו עם דגל הנקודה באה אחרי הדגל, כדי שלא תיגע בו
            const flagged = (e.type === '8' || e.type === '16') && !groups.some(g => g.includes(ei));
            const dotX = flagged ? x + hw - stemW + gw(e.type === '8' ? 'flag8thUp' : 'flag16thUp', sp) + sp * 0.25 : x + hw + sp * 0.35;
            if (e.dots) svg += glyph('augmentationDot', dotX, y - sp * 0.5, sp, col);
            notes.push({ x: x + hw / 2 });
            let stem = null;
            if (e.type !== 'w') {
              const sx = x + hw - stemW;
              stem = { x: sx, top: y - stemLen, col };
              const inBeam = groups.some(g => g.includes(ei));
              svg += `<rect x="${r(sx)}" y="${r(y - stemLen)}" width="${r(stemW)}" height="${r(stemLen - sp * 0.17)}" fill="${col}"/>`;
              if (!inBeam && (e.type === '8' || e.type === '16')) {
                svg += glyph(e.type === '8' ? 'flag8thUp' : 'flag16thUp', sx, y - stemLen, sp, col);
              }
            }
            pos.push(stem);
            noteIdx++;
          }
          x += adv;
        });
        // קורות: ראשית לכל הקבוצה, שנייה בין שש-עשריות צמודות, וקורה קצרה לשש-עשרית בודדת
        const bt = sp * 0.5, gap = sp * 0.25;
        groups.forEach(g => {
          const a = pos[g[0]], z = pos[g[g.length - 1]];
          if (!a || !z) return;
          svg += `<rect x="${r(a.x)}" y="${r(a.top)}" width="${r(z.x + stemW - a.x)}" height="${r(bt)}" fill="${ink}"/>`;
          const y2 = a.top + bt + gap;
          for (let k = 0; k < g.length; k++) {
            const e = cell.events[g[k]];
            if (e.type !== '16') continue;
            const p = pos[g[k]];
            const nextIs16 = k + 1 < g.length && cell.events[g[k + 1]].type === '16';
            const prevIs16 = k > 0 && cell.events[g[k - 1]].type === '16';
            if (nextIs16) {
              const q = pos[g[k + 1]];
              svg += `<rect x="${r(p.x)}" y="${r(y2)}" width="${r(q.x + stemW - p.x)}" height="${r(bt)}" fill="${ink}"/>`;
            } else if (!prevIs16) {
              // קורה קצרה: לכיוון התו שלפני אם זה סוף הקבוצה, אחרת קדימה
              const len = sp * 1.1;
              const toLeft = k === g.length - 1 || (k > 0 && cell.events[g[k - 1]].dots);
              const bx = toLeft ? p.x + stemW - len : p.x;
              svg += `<rect x="${r(bx)}" y="${r(y2)}" width="${r(len)}" height="${r(bt)}" fill="${ink}"/>`;
            }
          }
          if (cell.events[g[0]].tuplet) {
            const mid = (a.x + z.x + stemW) / 2;
            svg += glyph('tuplet3', mid - gw('tuplet3', sp * 0.8) / 2, a.top - sp * 0.6, sp * 0.8, ink);
          }
        });
      });
      // קו תיבה
      x += sp * 0.2;
      const last = b === ex.bars.length - 1;
      if (last && opts.final !== false) {
        svg += `<rect x="${r(x)}" y="${r(y - sp * 2)}" width="${r(sp * 0.16)}" height="${r(sp * 4)}" fill="${ink}"/>`;
        svg += `<rect x="${r(x + sp * 0.5)}" y="${r(y - sp * 2)}" width="${r(sp * 0.5)}" height="${r(sp * 4)}" fill="${ink}"/>`;
        x += sp * 1.0;
      } else {
        svg += `<rect x="${r(x)}" y="${r(y - sp * 2)}" width="${r(sp * 0.16)}" height="${r(sp * 4)}" fill="${ink}"/>`;
        x += sp * 1.6;
      }
    });
    const width = x + sp * 0.4;
    // הקו עצמו, מתחת לכל השאר
    svg = `<line x1="0" x2="${r(width - (opts.final === false ? 0 : sp * 0.4))}" y1="${r(y)}" y2="${r(y)}" stroke="${lineCol}" stroke-width="${r(sp * 0.13)}"/>` + svg;

    // סימוני דיוק מתחת לתווים: קו קצר, ונקודה שזזה שמאלה (מוקדם) או ימינה (מאוחר)
    // ספירה מתחת לתווים ("1 ו 2 ו") או מספרי הפעמות בלבד
    const hasText = !!(opts.counts || opts.beatNumbers);
    const ty = y + sp * 3.4;
    const txt = (tx, s) => `<text direction="ltr" x="${r(tx)}" y="${r(ty)}" text-anchor="middle" font-family="Assistant, sans-serif" font-size="${r(sp * 1.35)}" fill="#8a8a8a">${s}</text>`;
    if (opts.counts) {
      for (let b = 0; b < ex.bars.length; b++) {
        const inBar = evList.filter(v => v.bar === b);
        const labels = countLabels(ex.meter, inBar.map(v => ({ at: v.at, rest: v.e.rest, tuplet: v.e.tuplet })));
        inBar.forEach((v, i) => { if (labels[i]) svg += txt(v.x + sp * 0.6, labels[i]); });
      }
    }
    if (opts.beatNumbers) {
      const nb = ex.bars.length;
      for (let b = 0; b < nb; b++) {
        for (let k = 0; k < m.beats; k++) {
          const at = k * m.beatTicks;
          const v = evList.find(v => v.bar === b && v.at <= at && at < v.at + v.ticks);
          if (!v) continue;
          svg += txt(v.x + sp * 0.6 + (at - v.at) / v.ticks * v.adv, String(k + 1));
        }
      }
    }
    if (opts.marks) {
      const my = y + sp * (hasText ? 5.2 : 3.6);
      opts.marks.forEach((mk, i) => {
        const nx = notes[i] && notes[i].x;
        if (nx == null) return;
        svg += `<line x1="${r(nx - sp * 1.2)}" x2="${r(nx + sp * 1.2)}" y1="${r(my)}" y2="${r(my)}" stroke="#dddddd" stroke-width="${r(sp * 0.12)}"/>`;
        svg += `<line x1="${r(nx)}" x2="${r(nx)}" y1="${r(my - sp * 0.45)}" y2="${r(my + sp * 0.45)}" stroke="#cccccc" stroke-width="${r(sp * 0.1)}"/>`;
        if (mk.err === null) {
          svg += `<circle cx="${r(nx)}" cy="${r(my)}" r="${r(sp * 0.42)}" fill="#ffffff" stroke="#aaaaaa" stroke-width="${r(sp * 0.12)}"/>`;
        } else {
          const off = Math.max(-1.6, Math.min(1.6, mk.err / 0.04 * 0.4)) * sp;
          const ok = Math.abs(mk.err) <= mk.good;
          svg += `<circle cx="${r(nx + off)}" cy="${r(my)}" r="${r(sp * 0.42)}" fill="${ok ? ink : '#999999'}"/>`;
        }
      });
    }
    const height = opts.marks ? y + sp * (hasText ? 6.2 : 4.6) : hasText ? y + sp * 4.2 : y + sp * 3;
    return { svg, width, height, notes, y };
  }

  function svgWrap(R, opts) {
    opts = opts || {};
    const W = Math.max(R.width, opts.boxWidth || 0);
    const dx = (W - R.width) / 2;
    return `<svg viewBox="${r(-dx)} 0 ${r(W)} ${r(R.height)}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${r(W * (opts.scale || 1.6))}px;height:auto;display:block;margin:0 auto">${R.svg}</svg>`;
  }

  function svgFor(ex, opts) { return svgWrap(render(ex, opts), opts); }

  function naturalWidth(ex, opts) { return render(ex, opts).width; }

  // שורות: תיבות נארזות לשורה כל עוד הרוחב הטבעי לא עובר את maxWidth.
  // המשקל רק בשורה הראשונה, קו הסיום רק באחרונה. כל השורות באותו קנה מידה.
  function svgLines(ex, opts, maxWidth) {
    opts = opts || {};
    const lines = [];
    let cur = [];
    ex.bars.forEach((bar, b) => {
      const tryBars = cur.concat([b]);
      const sub = { meter: ex.meter, level: ex.level, bars: tryBars.map(i => ex.bars[i]) };
      const w = naturalWidth(sub, { sp: opts.sp, timeSig: lines.length === 0 });
      if (cur.length && w > maxWidth) { lines.push(cur); cur = [b]; } else cur = tryBars;
    });
    if (cur.length) lines.push(cur);
    let noteOffset = 0;
    const rendered = lines.map((idx, li) => {
      const sub = { meter: ex.meter, level: ex.level, bars: idx.map(i => ex.bars[i]) };
      const n = onsets(sub).length;
      const o = Object.assign({}, opts, {
        timeSig: li === 0, final: li === lines.length - 1 && opts.final !== false,
        marks: opts.marks ? opts.marks.slice(noteOffset, noteOffset + n) : undefined,
        noteStyle: opts.noteStyle ? opts.noteStyle.slice(noteOffset, noteOffset + n) : undefined,
        missing: opts.missing && idx.includes(opts.missing.bar) ? Object.assign({}, opts.missing, { bar: idx.indexOf(opts.missing.bar) }) : undefined
      });
      // תו חסר לא נספר בסימונים, אבל נספר ב-onsets; זה בסדר כי אין סימונים בהשלמה
      noteOffset += n;
      let R = render(sub, o);
      // שורות מלאות ברוחב אחיד, כמו בדפוס: מרווחים בין התווים נמתחים עד הרוחב של השורה הארוכה
      if (lines.length > 1) R.sub = sub, R.o = o;
      return R;
    });
    const W = Math.max(...rendered.map(x => x.width), opts.boxWidth || 0);
    rendered.forEach((x, i) => {
      if (!x.sub || x.width >= W - 0.5 || W / x.width > 1.7) return;
      const w2 = render(x.sub, Object.assign({}, x.o, { spread: 2 })).width;
      const spread = 1 + (W - x.width) / (w2 - x.width);
      rendered[i] = render(x.sub, Object.assign({}, x.o, { spread }));
    });
    return rendered.map(x => {
      // שורה שאינה האחרונה: הקו ממשיך עד הקצה, כמו בדפוס
      return svgWrap(x, Object.assign({}, opts, { boxWidth: W }));
    }).join('');
  }

  // סימן בודד (לאפשרויות בהשלמת תיבה)
  function symbolSvg(sym, opts) {
    opts = opts || {};
    const sp = opts.sp || 10;
    const e = parseCell(sym)[0];
    const ex = { meter: '4/4', bars: [[{ str: sym, events: [e], ticks: e.ticks, beats: 0 }]] };
    const R = render(ex, { sp, timeSig: false, final: false });
    // בלי קו ובלי קו תיבה: רק הסימן
    const body = R.svg.replace(/^<line[^>]*\/>/, '').replace(/<rect[^>]*height="[\d.]+" fill="[^"]*"\/>$/, '');
    const x0 = sp * 0.3, w = (e.dots ? sp * 3.6 : sp * 2.6), y0 = R.y - sp * 4.2;
    return `<svg viewBox="${r(x0)} ${r(y0)} ${r(w)} ${r(sp * 6.4)}" xmlns="http://www.w3.org/2000/svg" style="height:${opts.height || 64}px;width:auto;display:block;margin:0 auto">${body}</svg>`;
  }

  const RhythmCore = {
    TPQ, METERS, LEVELS, parseCell, cellsFor, allowedStart, fillSpan, generate, variant, dictation, completion,
    flatten, onsets, signature, writtenKey, beamGroups, timeline, barSeconds, scoreTaps, countLabels, render, svgFor, svgLines, naturalWidth, symbolSvg,
    symbolTicks, eventSymbol, GLYPHS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = RhythmCore;
  else root.RhythmCore = RhythmCore;
})(typeof window !== 'undefined' ? window : this);
