// מהלכים הרמוניים לפיתוח שמיעה: שלבים לפי סדר הספר של אלדוול ושכטר (Harmony and Voice Leading),
// יצירת מהלך מצירופים מקובלים (הרחבת טוניקה, סובדומיננטה, דומיננטה, סיום), סימון בספרות רומיות,
// והובלת קולות בארבעה קולות. סקריפט רגיל (window.HarmonyCore), וגם מודול ל-node.
(function (root) {
  // ===== הנושאים, לפי הסדר. שלב n = n הנושאים הראשונים =====
  const TOPICS = [
    { id: 'base', name: 'טוניקה ודומיננטה', desc: 'טוניקה ודומיננטה במצב יסודי' },
    { id: 'v7', name: 'ספטאקורד דומיננטה', desc: 'ספטאקורד הדומיננטה' },
    { id: 'inv', name: 'היפוכים', desc: 'הרחבת הטוניקה בהיפוכים של הטוניקה והדומיננטה' },
    { id: 'pd', name: 'סובדומיננטה', desc: 'סובדומיננטה לפני הדומיננטה, וזיהוי קדנצות' },
    { id: 'cad64', name: 'ששה־ארבע קדנציאלי', desc: 'ששה־ארבע קדנציאלי לפני הדומיננטה' },
    { id: 'vi', name: 'המעלה השישית', desc: 'האקורד על המעלה השישית, קדנצה מדומה ופריגית' },
    { id: 'iii', name: 'המעלה השלישית', desc: 'האקורד על המעלה השלישית, ששה־ארבע של פדל וחולף' },
    { id: 'sev', name: 'ספטאקורדים דיאטוניים', desc: 'ספטאקורד על המעלה השנייה לפני הדומיננטה' },
    { id: 'app', name: 'דומיננטות משניות', desc: 'דומיננטה של הדומיננטה ושל הסובדומיננטה' }
  ];
  // מהשלב הזה יש גם שאלות "איך זה נגמר?"
  const CADENCE_FROM = 4;

  const CADENCES = {
    auth: 'קדנצה מלאה',
    half: 'חצי קדנצה',
    plag: 'קדנצה פלגאלית',
    dec: 'קדנצה מדומה'
  };

  function flagsFor(stage) {
    const f = {};
    TOPICS.slice(0, stage).forEach(t => { f[t.id] = true; });
    f.base = true;
    return f;
  }

  // ===== צירופים. הסימון כאן תמיד באותיות גדולות; האותיות בתצוגה נקבעות לפי סוג האקורד בסולם =====
  const P = s => s.split(' ');
  function tonicIdioms(f) {
    const out = [P('I'), P('I V I')];
    if (f.v7) out.push(P('I V7 I'));
    if (f.inv) out.push(P('I V6 I'), P('I V65 I'), P('I V43 I6'), P('I6 V43 I'), P('I VII6 I6'), P('I V42 I6'), P('I I6'));
    if (f.iii) out.push(P('I IV64 I'), P('I V64 I6'), P('I6 V64 I'));
    return out;
  }
  function predominantIdioms(f, minor, ending) {
    const out = [];
    // במינור ii° מופיע רק בהיפוך ראשון
    if (f.pd) out.push(P('IV'), P('II6'));
    if (f.pd && !minor) out.push(P('II'));
    if (f.vi) out.push(P('VI IV'), P('VI II6'));
    if (f.vi && !minor) out.push(P('VI II'));
    if (f.iii) out.push(P('III IV'));
    if (f.sev) out.push(P('II7'), P('II65'), P('IV II65'));
    if (f.sev && f.vi) out.push(P('VI II65'));
    if (f.app) out.push(P('V65/V'), P('V7/V'), P('IV V65/V'), P('V7/IV IV'), P('V65/IV IV'));
    if (f.app && f.pd) out.push(P('II6 V65/V'));
    // קדנצה פריגית: IV6 ואז V, בסוף משפט במינור
    if (f.vi && minor && ending === 'half') out.push(P('IV6'), P('IV6'));
    return out;
  }
  function dominantIdioms(f, ending) {
    const out = [P('V')];
    if (f.v7 && ending !== 'half') out.push(P('V7'));
    if (f.cad64) out.push(P('I64 V'));
    if (f.cad64 && f.v7 && ending !== 'half') out.push(P('I64 V7'));
    return out;
  }

  const pick = a => a[Math.floor(Math.random() * a.length)];

  function endingsFor(f) {
    const e = ['auth', 'half'];
    if (f.pd) e.push('plag');
    if (f.vi) e.push('dec');
    return e;
  }

  function chooseEnding(f) {
    const w = { auth: 0.55, half: 0.22, plag: f.pd ? 0.1 : 0, dec: f.vi ? 0.15 : 0 };
    let r = Math.random() * Object.values(w).reduce((a, b) => a + b, 0);
    for (const k of Object.keys(w)) { r -= w[k]; if (r <= 0) return k; }
    return 'auth';
  }

  // רצף אקורדים (בסימון פנימי) למשפט אחד
  function buildTokens(f, minor, ending) {
    let seq = [...pick(tonicIdioms(f))];
    if (ending === 'plag') {
      if (seq[seq.length - 1] !== 'I') seq.push('I');
      return seq.concat(['IV', 'I']);
    }
    const pds = predominantIdioms(f, minor, ending);
    if (pds.length && Math.random() < 0.8) seq = seq.concat(pick(pds));
    let dom = pick(dominantIdioms(f, ending));
    seq = seq.concat(dom);
    if (ending === 'auth') seq.push('I');
    if (ending === 'dec') seq.push('VI');
    return seq;
  }

  function validSeq(seq, ending) {
    for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) return false;
    // אקורד משני הולך לאקורד שהוא מוביל אליו
    for (let i = 0; i < seq.length; i++) {
      const m = seq[i].match(/\/(.+)$/);
      if (!m) continue;
      const next = seq[i + 1] || '';
      const target = m[1];
      if (!(next.replace(/\d+$/, '') === target || (target === 'V' && next === 'I64'))) return false;
    }
    // חצי קדנצה נגמרת על V משולש
    if (ending === 'half' && seq[seq.length - 1] !== 'V') return false;
    return true;
  }

  // ===== אקורדים: צלילים וסימון =====
  const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7 };
  const ROMAN_OF = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
  const INV = { '': 0, '6': 1, '64': 2, '7': 0, '65': 1, '43': 2, '42': 3 };
  const FIG_TEXT = { '': '', '6': '⁶', '64': '⁶₄', '7': '⁷', '65': '⁶₅', '43': '⁴₃', '42': '⁴₂' };

  function parse(token) {
    const m = token.match(/^(VII|VI|V|IV|III|II|I)(\d*)(?:\/(VII|VI|V|IV|III|II|I))?$/);
    if (!m) throw new Error('bad chord ' + token);
    return { deg: ROMAN[m[1]], fig: m[2], of: m[3] ? ROMAN[m[3]] : null };
  }

  // צלילי האקורד כ-pitch class יחסית לטוניקה (0). במינור V ו־VII מקבלים את הצליל המוביל המוגבה
  function chordInfo(token, mode) {
    const { deg, fig, of } = parse(token);
    const seventh = ['7', '65', '43', '42'].includes(fig);
    const sc = SCALE[mode];
    let pcs, lt = null;
    if (of) {
      const rootPc = (sc[of - 1] + 7) % 12;
      pcs = [0, 4, 7, 10].slice(0, seventh ? 4 : 3).map(x => (rootPc + x) % 12);
      lt = pcs[1];
    } else {
      pcs = [0, 2, 4, 6].slice(0, seventh ? 4 : 3).map(x => sc[(deg - 1 + x) % 7]);
      if (mode === 'minor' && (deg === 5 || deg === 7)) pcs = pcs.map(p => p === 10 ? 11 : p);
      if (deg === 5) lt = pcs[1];
      if (deg === 7) lt = pcs[0];
    }
    const inv = INV[fig];
    return { token, deg, fig, of, seventh, pcs, inv, bassPc: pcs[inv], lt, sevPc: seventh ? pcs[3] : null };
  }

  function quality(pcs) {
    const r = pcs[0];
    const iv = pcs.map(p => (p - r + 12) % 12).join(',');
    return {
      '0,4,7': ['U', ''], '0,3,7': ['L', ''], '0,3,6': ['L', '°'], '0,4,8': ['U', '+'],
      '0,4,7,10': ['U', ''], '0,4,7,11': ['U', ''], '0,3,7,10': ['L', ''], '0,3,6,10': ['L', 'ø'], '0,3,6,9': ['L', '°']
    }[iv] || ['U', ''];
  }

  // סימון: אותיות גדולות למז׳ור (ומוגדל), קטנות למינור ולמוקטן
  function romanText(deg, pcs) {
    const [c, mark] = quality(pcs);
    const r = ROMAN_OF[deg];
    return (c === 'U' ? r : r.toLowerCase()) + mark;
  }

  function label(token, mode) {
    const ch = chordInfo(token, mode);
    let base, target = '';
    if (ch.of) {
      base = 'V';
      const t = chordInfo(ROMAN_OF[ch.of], mode);
      target = romanText(ch.of, t.pcs);
    } else {
      base = romanText(ch.deg, ch.pcs);
    }
    // ספטאקורד במצב יסודי מסומן 7; ø ו-° של ספטאקורד כבר אומרים "ספטאקורד" ונשארים עם הספרות
    const text = base + FIG_TEXT[ch.fig] + (target ? '/' + target : '');
    const fig = ch.fig;
    let figHtml = '';
    if (fig.length === 1) figHtml = `<sup>${fig}</sup>`;
    else if (fig.length === 2) figHtml = `<span class="rn-st"><span>${fig[0]}</span><span>${fig[1]}</span></span>`;
    const html = `<span class="rn" dir="ltr">${base}${figHtml}${target ? '<span class="rn-of">/' + target + '</span>' : ''}</span>`;
    return { text, html };
  }

  // משפחה לרמז: טוניקה, סובדומיננטה, דומיננטה או דומיננטה משנית
  function family(token) {
    if (token === 'I64') return 'D';
    const { deg, of } = parse(token);
    if (of) return 'A';
    return { 1: 'T', 3: 'T', 2: 'S', 4: 'S', 6: 'S', 5: 'D', 7: 'D' }[deg];
  }
  const FAMILY_NAMES = { T: 'טוניקה', S: 'סובדומיננטה', D: 'דומיננטה', A: 'דומיננטה משנית' };

  // ===== הובלת קולות: בס, טנור, אלט, סופרן =====
  const RANGE = { b: [40, 60], t: [48, 67], a: [55, 74], s: [60, 79] };

  function inRange(pc, lo, hi) {
    const out = [];
    for (let m = lo; m <= hi; m++) if ((m % 12 + 12) % 12 === pc) out.push(m);
    return out;
  }

  function candidates(ch, tonic) {
    const abs = p => (p + tonic) % 12;
    const pcs = ch.pcs.map(abs);
    const bassPc = abs(ch.bassPc);
    const lt = ch.lt === null ? null : abs(ch.lt);
    const sev = ch.sevPc === null ? null : abs(ch.sevPc);
    const root = pcs[0], third = pcs[1], fifth = pcs[2];
    const upper = v => pcs.flatMap(pc => inRange(pc, RANGE[v][0], RANGE[v][1])).sort((x, y) => x - y);
    const T = upper('t'), A = upper('a'), S = upper('s');
    const out = [];
    inRange(bassPc, RANGE.b[0], RANGE.b[1]).forEach(b => {
      T.forEach(t => {
        if (t <= b || t - b > 19) return;
        A.forEach(a => {
          if (a <= t || a - t > 12) return;
          S.forEach(s => {
            if (s <= a || s - a > 12) return;
            const v = [b, t, a, s];
            const count = {};
            v.forEach(m => { const pc = m % 12; count[pc] = (count[pc] || 0) + 1; });
            if (!count[root] || !count[third]) return;
            if (sev !== null && count[sev] !== 1) return;
            if (lt !== null && count[lt] > 1) return;
            let cost = 0;
            if (!count[fifth]) {
              // בלי קווינטה רק במצב יסודי
              if (ch.inv !== 0) return;
              cost += ch.seventh ? 1 : 3;
            }
            if (!ch.seventh) {
              const doubled = pcs.find(pc => count[pc] >= 2);
              if (ch.inv === 0) cost += doubled === root ? 0 : doubled === fifth ? 2 : (ch.deg === 6 ? 1 : 4);
              else if (ch.inv === 1) cost += doubled === root ? 0 : doubled === fifth ? 0.5 : 1;
              else cost += doubled === bassPc ? 0 : 4;
            }
            out.push({ v, cost, lt, sev });
          });
        });
      });
    });
    return out;
  }

  function transCost(p, n, nextPcs) {
    let c = 0;
    for (let i = 1; i < 4; i++) {
      const d = Math.abs(n.v[i] - p.v[i]);
      c += d;
      if (d > 4) c += (d - 4) * 1.5;
    }
    c += Math.abs(n.v[0] - p.v[0]) * 0.15;
    // קווינטות ואוקטבות מקבילות
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
      const pi = (p.v[j] - p.v[i]) % 12, ni = (n.v[j] - n.v[i]) % 12;
      const di = n.v[i] - p.v[i], dj = n.v[j] - p.v[j];
      if (di === 0 && dj === 0) continue;
      if ((pi === 7 && ni === 7) || (pi === 0 && ni === 0)) {
        if (Math.sign(di) === Math.sign(dj)) c += 40;
      }
    }
    // אוקטבה/קווינטה נסתרת בקולות החיצוניים עם קפיצה בסופרן
    const outer = (n.v[3] - n.v[0]) % 12;
    const ds = n.v[3] - p.v[3], db = n.v[0] - p.v[0];
    if ((outer === 0 || outer === 7) && Math.sign(ds) === Math.sign(db) && ds !== 0 && Math.abs(ds) > 2) c += 6;
    // חפיפת קולות
    if (n.v[1] > p.v[2] || n.v[2] < p.v[1] || n.v[2] > p.v[3] || n.v[3] < p.v[2]) c += 8;
    // הצליל המוביל עולה לטוניקה, והספטימה יורדת בצעד
    for (let i = 0; i < 4; i++) {
      const pc = p.v[i] % 12;
      if (p.lt !== null && pc === p.lt && nextPcs.includes((pc + 1) % 12) && i > 0) {
        if (n.v[i] !== p.v[i] + 1) c += i === 3 ? 15 : 3;
      }
      if (p.sev !== null && pc === p.sev) {
        const d = p.v[i] - n.v[i];
        if (d !== 1 && d !== 2 && d !== 0) c += 12;
      }
    }
    return c;
  }

  function startCost(c) {
    return c.cost + Math.abs(c.v[3] - 71) * 0.3 + Math.abs(c.v[0] - 50) * 0.1;
  }

  // תכנון דינמי: הובלת הקולות הזולה ביותר לכל המהלך
  function voice(chords, tonic) {
    const abs = ch => ch.pcs.map(p => (p + tonic) % 12);
    const layers = chords.map(ch => candidates(ch, tonic));
    let best = layers[0].map(c => ({ c, cost: startCost(c), prev: null }));
    const hist = [best];
    for (let k = 1; k < layers.length; k++) {
      const nextPcs = abs(chords[k]);
      const cur = layers[k].map(c => {
        let bp = null, bc = Infinity;
        for (const s of best) {
          const x = s.cost + transCost(s.c, c, nextPcs);
          if (x < bc) { bc = x; bp = s; }
        }
        return { c, cost: bc + c.cost, prev: bp };
      });
      best = cur;
      hist.push(cur);
    }
    let end = best.reduce((a, b) => (b.cost < a.cost ? b : a));
    const total = end.cost;
    const out = [];
    while (end) { out.unshift(end.c.v); end = end.prev; }
    return { voices: out, cost: total };
  }

  // האקורד שנבחר בטעות, בהובלה הקרובה ביותר לאקורד שלפניו
  function voiceAfter(prevVoices, prevToken, token, mode, tonic) {
    const prev = chordInfo(prevToken, mode);
    const p = candidates(prev, tonic).find(c => c.v.join() === prevVoices.join()) ||
      { v: prevVoices, cost: 0, lt: null, sev: null };
    const ch = chordInfo(token, mode);
    const nextPcs = ch.pcs.map(x => (x + tonic) % 12);
    let best = null, bc = Infinity;
    candidates(ch, tonic).forEach(c => {
      const x = c.cost + transCost(p, c, nextPcs);
      if (x < bc) { bc = x; best = c; }
    });
    return best ? best.v : prevVoices;
  }

  // ===== תרגיל =====
  // [מינימום, מקסימום] אקורדים בכל שלב (שלב 1 = I ו-V בלבד: 3, וחצי קדנצה I V I V)
  const LENGTHS = [[3, 4], [3, 4], [4, 5], [4, 5], [4, 5], [4, 6], [5, 6], [5, 6], [5, 6]];
  // opts: { flags | stage, mode: 'major' | 'minor' | 'both', kind: 'prog' | 'cad' }
  function generate(opts) {
    const f = opts.flags || flagsFor(opts.stage || 1);
    const kind = opts.kind || 'prog';
    const mode = opts.mode === 'major' || opts.mode === 'minor' ? opts.mode : (Math.random() < 0.5 ? 'major' : 'minor');
    // אורך המהלך לפי השלב: מעט אקורדים כשיש מעט פונקציות, ומהלך ארוך רק כשיש מה למלא בו
    const [lo, hi] = LENGTHS[Math.min(Object.keys(f).length, LENGTHS.length) - 1];
    const minLen = kind === 'cad' ? 3 : lo;
    const maxLen = hi;
    let tokens = null, ending = null;
    for (let i = 0; i < 400 && !tokens; i++) {
      ending = kind === 'cad' ? pick(endingsFor(f)) : chooseEnding(f);
      const seq = buildTokens(f, mode === 'minor', ending);
      if (seq.length >= minLen && seq.length <= maxLen && validSeq(seq, ending)) tokens = seq;
    }
    if (!tokens) { tokens = ['I', 'V', 'I']; ending = 'auth'; }
    const tonic = Math.floor(Math.random() * 12);
    const chords = tokens.map(t => chordInfo(t, mode));
    const { voices } = voice(chords, tonic);
    return {
      mode, tonic, ending, kind,
      tokens,
      chords: tokens.map((t, i) => Object.assign({ token: t, family: family(t), voices: voices[i] }, label(t, mode))),
      voices
    };
  }

  // כל האקורדים שיכולים להופיע בשלב, לכפתורי התשובה, בסדר קבוע: לפי מעלה, ואז לפי היפוך
  const FIG_ORDER = ['', '6', '64', '7', '65', '43', '42'];
  function vocabulary(f, mode) {
    const minor = mode === 'minor';
    const set = new Set();
    const add = list => list.forEach(seq => seq.forEach(t => set.add(t)));
    add(tonicIdioms(f));
    ['auth', 'half', 'plag', 'dec'].forEach(e => { add(predominantIdioms(f, minor, e)); add(dominantIdioms(f, e)); });
    set.add('I');
    if (f.pd) set.add('IV');
    if (f.vi) set.add('VI');
    const key = t => {
      const p = parse(t);
      return (p.of ? 100 + p.of * 10 : p.deg * 10) + FIG_ORDER.indexOf(p.fig);
    };
    return [...set].sort((a, b) => key(a) - key(b)).map(t => Object.assign({ token: t, family: family(t) }, label(t, mode)));
  }

  function cadenceOptions(f) {
    return endingsFor(f).map(id => ({ id, name: CADENCES[id] }));
  }

  const HarmonyCore = {
    TOPICS, CADENCE_FROM, CADENCES, FAMILY_NAMES, flagsFor, generate, vocabulary, cadenceOptions,
    chordInfo, label, family, voice, voiceAfter, candidates, transCost, parse
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = HarmonyCore;
  else root.HarmonyCore = HarmonyCore;
})(typeof window !== 'undefined' ? window : this);
