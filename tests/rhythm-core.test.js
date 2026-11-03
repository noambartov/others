// בדיקות ללוגיקת הקצב. הרצה: node tests/rhythm-core.test.js
const assert = require('assert');
const R = require('../rhythm-core.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { console.error('FAIL: ' + name); throw e; }
}

// מחולל אקראי קבוע, כדי שכישלון יחזור על עצמו
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const barTicks = meter => R.METERS[meter].barTicks;
const PART_SETS = [['h', 'q'], ['q', '8'], ['8', '16', 'tie'], ['q', '8', 'T'], ['h', 'q', '8', '16', 'T', 'tie'], ['16'], ['T', 'tie'], ['8', 'tie']];

test('every generated bar fills its meter exactly, with cells on allowed beats', () => {
  const rnd = seeded(1);
  for (let level = 1; level <= R.LEVELS.length; level++) {
    for (let k = 0; k < 300; k++) {
      const parts = PART_SETS[k % PART_SETS.length];
      const ex = R.generate(level, ['dictation', 'tap', 'complete'][k % 3], rnd, null, parts);
      assert.ok(R.LEVELS[level - 1].meters.includes(ex.meter));
      ex.bars.forEach(bar => {
        const sum = bar.reduce((a, c) => a + c.events.reduce((b, e) => b + e.ticks, 0), 0);
        assert.strictEqual(sum, barTicks(ex.meter), `${ex.meter} ${bar.map(c => c.str).join('|')}`);
        let pos = 0;
        bar.forEach(c => {
          assert.strictEqual(c.start, pos);
          assert.ok(R.allowedStart(ex.meter, c, c.start), `${c.str} at ${c.start} in ${ex.meter}`);
          // רק תאים מהמרכיבים שנבחרו (או הפסקת פעמה כשאין תא מתאים)
          assert.ok(c.need === '' ? c.events.every(e => e.rest) : c.need.split(' ').every(p => R.normParts(parts).includes(p)), `${c.str} with ${parts}`);
          pos += c.beats;
        });
      });
    }
  }
});

test('all durations are whole ticks, triplets included', () => {
  R.parseCell('T8 8 8').forEach(e => assert.strictEqual(e.ticks, 4));
  assert.strictEqual(R.parseCell('8. 16').reduce((a, e) => a + e.ticks, 0), R.TPQ);
  assert.strictEqual(R.parseCell('q.')[0].ticks, 18);
});

test('dictation gives four options that all sound different, one of them the answer', () => {
  const rnd = seeded(2);
  for (let level = 1; level <= R.LEVELS.length; level++) {
    for (let k = 0; k < 150; k++) {
      const d = R.dictation(level, rnd, PART_SETS[k % PART_SETS.length]);
      assert.ok(d, 'level ' + level);
      assert.strictEqual(d.options.length, 4);
      const sigs = new Set(d.options.map(R.signature));
      assert.strictEqual(sigs.size, 4, d.options.map(R.writtenKey).join(' / '));
      assert.strictEqual(R.signature(d.options[d.correct]), R.signature(d.answer));
      d.options.forEach(o => assert.strictEqual(o.meter, d.answer.meter));
    }
  }
});

test('completion: exactly one option has the missing duration', () => {
  const rnd = seeded(3);
  for (let level = 1; level <= R.LEVELS.length; level++) {
    for (let k = 0; k < 150; k++) {
      const c = R.completion(level, rnd, PART_SETS[k % PART_SETS.length]);
      assert.ok(c, 'level ' + level);
      const ev = c.ex.bars[c.missing.bar][c.missing.cell].events[c.missing.ev];
      assert.strictEqual(R.eventSymbol(ev), c.answer);
      assert.strictEqual(c.options[c.correct], c.answer);
      assert.strictEqual(new Set(c.options).size, 4);
      const fits = c.options.filter(s => R.symbolTicks(s) === ev.ticks && (s[0] === 'R') === ev.rest);
      assert.strictEqual(fits.length, 1, c.options.join(','));
      assert.strictEqual(ev.tuplet, 0);
    }
  }
});

test('timeline in seconds follows the tempo; in 6/8 the beat is a dotted quarter', () => {
  const cells = R.cellsFor('6/8', 6, ['q', '8']);
  const ex = { meter: '6/8', level: 6, bars: [[cells.find(c => c.str === '8 8 8'), cells.find(c => c.str === 'q.')]] };
  const t = R.timeline(ex, 60);
  assert.deepStrictEqual(t.map(n => +n.start.toFixed(4)), [0, 0.3333, 0.6667, 1]);
  assert.strictEqual(R.barSeconds(ex, 60), 2);
});

test('scoreTaps: lenient window, steady device lag forgiven, missed and extra taps', () => {
  const exp = [0, 0.5, 1, 1.5, 2, 2.5];
  const r1 = R.scoreTaps(exp, [0.1, 0.43, 1.12, 1.5, 1.9, 2.6], { beat: 0.5 });
  assert.ok(r1.passed, 'within about a fifth of a beat counts');
  // כל ההקשות מאחרות ב-0.15 שנ' (עיכוב של המכשיר), גם בשש-עשריות צפופות: מקוזז
  const dense = [0, 0.1875, 0.375, 0.5625, 0.75, 0.9375, 1.125, 1.3125];
  const r2 = R.scoreTaps(dense, dense.map((t, i) => t + 0.15 + (i % 2 ? 0.02 : -0.02)), { beat: 0.75 });
  assert.ok(r2.perfect, 'constant lag is compensated');
  const r2b = R.scoreTaps(exp, exp.map(t => t + 0.15), { beat: 0.5 });
  assert.ok(r2b.perfect && r2b.offset > 0);
  // מי שמקיש בזמן לא מוזז
  assert.strictEqual(R.scoreTaps(exp, exp.slice(), { beat: 0.5 }).offset, 0);
  // הקשה כפולה מהירה נספרת כאחת
  const r3 = R.scoreTaps(exp, exp.concat([0.03]), { beat: 0.5 });
  assert.strictEqual(r3.extra, 0);
  const r4 = R.scoreTaps(exp, [0, 0.5, 1, 1.5, 2], { beat: 0.5 });
  assert.strictEqual(r4.missed, 1);
  assert.strictEqual(r4.errors[5], null);
  assert.ok(!r4.passed);
  const r5 = R.scoreTaps(exp, exp.concat([0.25, 1.25]), { beat: 0.5 });
  assert.strictEqual(r5.extra, 2);
  assert.ok(!r5.passed);
  const r6 = R.scoreTaps(exp, [0, 0.5, 1.22, 1.5, 2, 2.5], { beat: 0.5 });
  assert.strictEqual(r6.late, 1);
});

test('konnakol syllables follow the finest subdivision in each beat', () => {
  const lab = (meter, cells) => {
    let at = 0;
    const evs = [];
    cells.forEach(c => R.parseCell(c).forEach(e => { evs.push({ at, rest: e.rest, tuplet: e.tuplet }); at += e.ticks; }));
    return R.countLabels(meter, evs).join(' ');
  };
  assert.strictEqual(lab('4/4', ['q', '8 8', '16 16 16 16', 'T8 8 8']), 'ta ta ka ta ka di mi ta ki ta');
  assert.strictEqual(lab('2/4', ['8 16 16', '8. 16']), 'ta di mi ta mi');
  assert.strictEqual(lab('4/4', ['8 q 8', 'R8 8', 'q']), 'ta ka ka  ka ta');
  assert.strictEqual(lab('6/8', ['8 8 8', '16 16 8 8']), 'ta ki ta ta ka di ta');
});

test('rendering draws one notehead per sounding note and never throws', () => {
  const rnd = seeded(4);
  for (let level = 1; level <= R.LEVELS.length; level++) {
    for (let k = 0; k < 60; k++) {
      const ex = R.generate(level, 'tap', rnd, null, PART_SETS[k % PART_SETS.length]);
      const out = R.render(ex);
      assert.strictEqual(out.notes.length, R.onsets(ex).length);
      assert.ok(!/NaN|undefined/.test(out.svg));
      const lines = R.svgLines(ex, { counts: true, beatNumbers: true }, 200);
      assert.ok(!/NaN|undefined/.test(lines));
    }
  }
});

test('levels: meters, length and variety grow; tempo starts at the level tempo', () => {
  const rnd = seeded(5);
  assert.deepStrictEqual(R.LEVELS.map(l => l.tempo), [60, 70, 80, 90, 100, 110]);
  // רמה 1: לכל היותר שתי דמויות קצב בתרגיל
  for (let k = 0; k < 200; k++) {
    const ex = R.generate(1, 'tap', rnd, null, ['h', 'q', '8', '16']);
    const figs = new Set(ex.bars.flat().filter(c => c.events.some(e => !e.rest)).map(c => c.str));
    assert.ok(figs.size <= 2, R.writtenKey(ex));
    assert.ok(['2/4', '4/4'].includes(ex.meter));
  }
  // רמה 3 ומעלה: ארבע תיבות לפחות בהקשה
  for (let k = 0; k < 50; k++) assert.ok(R.generate(3, 'tap', rnd, '4/4').bars.length === 4);
  const odd = new Set();
  for (let k = 0; k < 200; k++) odd.add(R.generate(6, 'tap', rnd, null, ['q', '8']).meter);
  assert.ok(odd.has('5/8') && odd.has('7/8'));
});

test('odd meters: beats are 2+3 and 2+2+3 eighths, metronome times follow them', () => {
  assert.deepStrictEqual(R.METERS['7/8'].groups, [12, 12, 18]);
  assert.deepStrictEqual(R.beatTimes('7/8', 60), [0, 1, 2]);
  assert.strictEqual(R.barSeconds({ meter: '5/8' }, 60), 2.5);
  const rnd = seeded(6);
  for (let k = 0; k < 100; k++) {
    const ex = R.generate(6, 'dictation', rnd, '5/8', ['q', '8', '16']);
    ex.bars.forEach(b => assert.deepStrictEqual(b.map(c => c.ticks), [12, 18], R.writtenKey(ex)));
  }
});

test('ties: tied note is held, not played again, and has no syllable', () => {
  const rnd = seeded(7);
  let seen = 0;
  for (let k = 0; k < 200; k++) {
    const ex = R.generate(3, 'tap', rnd, '4/4', ['q', '8', 'tie']);
    const flat = R.flatten(ex);
    const tied = flat.filter(e => e.tied);
    if (!tied.length) continue;
    seen++;
    const t = R.timeline(ex, 60);
    const total = t.reduce((a, n) => a + n.dur, 0);
    assert.ok(Math.abs(total - R.barSeconds(ex, 60) * ex.bars.length) < 1e-9);
    assert.strictEqual(t.filter(n => !n.rest).length, R.onsets(ex).length);
    assert.strictEqual(R.render(ex).notes.length, R.onsets(ex).length);
    flat.forEach((e, i) => { if (e.tie) assert.ok(flat[i + 1].tied && !flat[i + 1].rest); });
  }
  assert.ok(seen > 150, 'ties appear when selected');
  assert.strictEqual(R.countLabels('4/4', [{ at: 0 }, { at: 6, tied: true }, { at: 12 }]).join(' '), 'ta  ta');
});

console.log(`rhythm-core: ${passed} tests passed`);
