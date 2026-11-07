// בדיקות למהלכים ההרמוניים: סדר השלבים, סימון, והובלת קולות. הרצה: node tests/harmony-core.test.js
const assert = require('assert');
const H = require('../harmony-core.js');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error('FAIL: ' + name);
    throw e;
  }
}

test('labels: upper case for major, lower case for minor and diminished', () => {
  const t = (tok, mode) => H.label(tok, mode).text;
  assert.strictEqual(t('I', 'major'), 'I');
  assert.strictEqual(t('II6', 'major'), 'ii⁶');
  assert.strictEqual(t('VII6', 'major'), 'vii°⁶');
  assert.strictEqual(t('I', 'minor'), 'i');
  assert.strictEqual(t('IV', 'minor'), 'iv');
  assert.strictEqual(t('V', 'minor'), 'V');
  assert.strictEqual(t('VI', 'minor'), 'VI');
  assert.strictEqual(t('II65', 'minor'), 'iiø⁶₅');
  assert.strictEqual(t('V65', 'major'), 'V⁶₅');
  assert.strictEqual(t('V7/V', 'major'), 'V⁷/V');
  assert.strictEqual(t('V65/IV', 'minor'), 'V⁶₅/iv');
});

test('chord tones: raised leading tone in minor V and vii°, applied dominants', () => {
  assert.deepStrictEqual(H.chordInfo('V', 'minor').pcs, [7, 11, 2]);
  assert.deepStrictEqual(H.chordInfo('VII6', 'minor').pcs, [11, 2, 5]);
  assert.deepStrictEqual(H.chordInfo('III', 'minor').pcs, [3, 7, 10]);
  assert.deepStrictEqual(H.chordInfo('V7/V', 'major').pcs, [2, 6, 9, 0]);
  assert.strictEqual(H.chordInfo('V43', 'major').bassPc, 2);
});


for (let stage = 1; stage <= H.TOPICS.length; stage++) {
  test(`stage ${stage}: progressions are valid and well voiced`, () => {
    const f = H.flagsFor(stage);
    for (let i = 0; i < 300; i++) {
      const kind = stage >= H.CADENCE_FROM && i % 3 === 0 ? 'cad' : 'prog';
      const ex = H.generate({ flags: f, kind });
      const vocab = H.vocabulary(f, ex.mode).map(v => v.token);
      assert.strictEqual(ex.tokens[0].replace(/\d+$/, ''), 'I', 'starts on the tonic: ' + ex.tokens);
      const max = [4, 4, 5, 5, 5, 6, 6, 6, 6][stage - 1];
      assert.ok(ex.tokens.length >= 3 && ex.tokens.length <= max, `stage ${stage} length ${ex.tokens}`);
      ex.tokens.forEach(t => assert.ok(vocab.includes(t), `${t} is in the stage ${stage} buttons (${ex.mode})`));
      if (ex.mode === 'minor') assert.ok(!ex.tokens.includes('II'), 'no root-position ii° in minor');
      assert.ok(H.cadenceOptions(f).some(c => c.id === ex.ending));
      if (ex.ending === 'half') assert.strictEqual(ex.tokens[ex.tokens.length - 1], 'V');
      if (ex.ending === 'dec') assert.strictEqual(ex.tokens[ex.tokens.length - 1], 'VI');
      ex.voices.forEach((v, k) => {
        const ch = H.chordInfo(ex.tokens[k], ex.mode);
        const pcs = ch.pcs.map(p => (p + ex.tonic) % 12);
        const [b, tn, a, s] = v;
        assert.ok(b < tn && tn < a && a < s, 'voice order ' + v);
        assert.ok(s - a <= 12 && a - tn <= 12, 'spacing ' + v);
        assert.strictEqual(b % 12, (ch.bassPc + ex.tonic) % 12, 'bass is the inversion note');
        v.forEach(m => assert.ok(pcs.includes(m % 12), 'chord tone'));
        if (ch.lt !== null) assert.ok(v.filter(m => m % 12 === (ch.lt + ex.tonic) % 12).length <= 1, 'leading tone not doubled ' + ex.tokens[k]);
        if (k === 0) return;
        const p = ex.voices[k - 1];
        for (let x = 0; x < 4; x++) for (let y = x + 1; y < 4; y++) {
          const pi = (p[y] - p[x]) % 12, ni = (v[y] - v[x]) % 12;
          const moved = p[x] !== v[x] || p[y] !== v[y];
          if (moved && ((pi === 7 && ni === 7) || (pi === 0 && ni === 0)) && Math.sign(v[x] - p[x]) === Math.sign(v[y] - p[y])) {
            assert.fail(`parallel ${pi === 7 ? 'fifths' : 'octaves'} in ${ex.tokens.join(' ')} (${ex.mode}) at ${k}`);
          }
        }
        for (let x = 1; x < 4; x++) assert.ok(Math.abs(v[x] - p[x]) <= 9, 'no big leap in upper voices ' + ex.tokens);
      });
    }
  });
}

test('cadence questions appear from the subdominant stage, deceptive with the sixth degree', () => {
  assert.deepStrictEqual(H.cadenceOptions(H.flagsFor(4)).map(c => c.id), ['auth', 'half', 'plag']);
  assert.ok(H.cadenceOptions(H.flagsFor(6)).some(c => c.id === 'dec'));
  assert.strictEqual(H.CADENCES.dec, 'קדנצה מדומה');
});

test('stage 1 buttons are only I and V', () => {
  assert.deepStrictEqual(H.vocabulary(H.flagsFor(1), 'major').map(v => v.text), ['I', 'V']);
  assert.deepStrictEqual(H.vocabulary(H.flagsFor(1), 'minor').map(v => v.text), ['i', 'V']);
});

console.log(`harmony-core: ${passed} tests passed`);
