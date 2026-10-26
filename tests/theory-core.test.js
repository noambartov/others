// בדיקות ללוגיקה המשותפת. הרצה: node tests/theory-core.test.js
const assert = require('assert');
const T = require('../theory-core.js');

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

test('note() places the bottom line correctly in both clefs', () => {
  const e4 = T.note(0, 0, 'sol');
  assert.strictEqual(e4.name, 'מי');
  assert.strictEqual(e4.midiNum, 64);
  const g2 = T.note(0, 0, 'fa');
  assert.strictEqual(g2.name, 'סול');
  assert.strictEqual(g2.midiNum, 43);
  assert.strictEqual(T.note(-2, 0, 'sol').midiNum, 60); // דו אמצעי
  assert.strictEqual(T.note(10, 0, 'fa').midiNum, 60);
});

test('every structure has the right semitones from every root, inversion and given voice', () => {
  let count = 0;
  for (const type of Object.keys(T.CATALOG)) {
    const inversions = T.INVERSIONS[type] ? T.INVERSIONS[type].length : 1;
    for (const struct of T.CATALOG[type]) {
      for (const clef of ['sol', 'fa']) {
        for (let line = -4; line <= 10; line++) {
          for (const acc of [-1, 0, 1]) {
            for (let inv = 0; inv < inversions; inv++) {
              for (const given of ['root', 'bass', 'soprano']) {
                const { notes, root } = T.build(struct, { line, acc, clef, inversion: inv, given });
                const n = notes.length;
                const expected = struct.steps.map((_, i) => {
                  const orig = (i + inv) % n;
                  return struct.semitones[orig] + (orig < inv ? 12 : 0);
                });
                assert.deepStrictEqual(notes.map(x => x.midiNum - root.midiNum), expected, `${type} ${struct.name} inv${inv} ${given}`);
                const givenNote = given === 'root' ? root : (given === 'bass' ? notes[0] : notes[n - 1]);
                assert.strictEqual(givenNote.absLine, line);
                assert.strictEqual(givenNote.acc, acc);
                count++;
              }
            }
          }
        }
      }
    }
  }
  assert.ok(count > 10000);
});

test('the major scale of every key has exactly its key signature', () => {
  const major = T.findStructure('scales', 'major');
  for (const key of T.KEYS) {
    for (const clef of ['sol', 'fa']) {
      const line = T.lineForLetter(key.major[0], clef, -2);
      const { notes } = T.build(major, { line, acc: key.major[1], clef });
      const accs = notes.slice(0, 7).map(n => n.acc);
      assert.strictEqual(accs.filter(a => a !== 0).length, key.accCount, key.name);
      assert.ok(accs.every(a => a === 0 || a === key.accType), key.name);
      assert.strictEqual(notes[0].letter, key.major[0]);
    }
  }
});

test('minor keys: natural minor matches the relative major key signature', () => {
  const minor = T.findStructure('scales', 'minor_natural');
  for (const key of T.KEYS) {
    const line = T.lineForLetter(key.minor[0], 'sol', -2);
    const { notes } = T.build(minor, { line, acc: key.minor[1], clef: 'sol' });
    assert.strictEqual(notes.slice(0, 7).filter(n => n.acc !== 0).length, key.accCount, key.name);
  }
});

test('double accidentals are spelled, not dropped', () => {
  // רה♭ מינור הרמוני: סי♭♭ בדרגה 6
  const harmonic = T.findStructure('scales', 'minor_harmonic');
  const db = T.build(harmonic, { line: T.lineForLetter(1, 'sol', -2), acc: -1, clef: 'sol' });
  assert.strictEqual(db.notes[5].name, 'סי♭♭');
  // סול♯ מינור הרמוני: פה♯♯ בדרגה 7
  const gs = T.build(harmonic, { line: T.lineForLetter(4, 'sol', -2), acc: 1, clef: 'sol' });
  assert.strictEqual(gs.notes[6].name, 'פה♯♯');
  assert.strictEqual(T.noteName(3, 3), 'פה(?)');
});

test('chord root name is right for inversions with an accidental root', () => {
  const major = T.findStructure('chords', 'major');
  // בס = מי♯ (שורה 0 במפתח סול), היפוך ראשון => דו♯ מז׳ור
  const r = T.build(major, { line: 0, acc: 1, clef: 'sol', inversion: 1, given: 'bass' });
  assert.strictEqual(r.root.name, 'דו♯');
  assert.deepStrictEqual(r.notes.map(n => n.name), ['מי♯', 'סול♯', 'דו♯']);
});

test('soprano-given chords below the staff do not crash', () => {
  for (const s of T.CATALOG.septachords) {
    T.build(s, { line: 3, acc: 0, clef: 'sol', inversion: 0, given: 'soprano' });
  }
});

test('identifyInterval', () => {
  const cases = [
    [[0, 0, 4, 0, 'up'], 5, 7, 'זכה'],
    [[1, 0, 2, 1, 'up'], 2, 3, 'מוגדלת'],
    [[1, -1, 0, 1, 'up'], 7, 12, 'מוגדלת'],
    [[0, 0, 0, 1, 'down'], 8, 11, 'מוקטנת'],
    [[0, 0, 0, 0, 'up'], 1, 0, 'זכה'],
    [[0, 0, 0, 1, 'up'], 1, 1, 'מוגדלת'],
    [[6, 1, 0, 0, 'up'], 2, 0, 'מוקטנת'],
    [[0, 0, 5, 0, 'down'], 3, 3, 'קטנה'],
    [[3, 0, 6, 0, 'up'], 4, 6, 'מוגדלת']
  ];
  for (const [args, number, semitones, quality] of cases) {
    const r = T.identifyInterval(...args);
    assert.deepStrictEqual([r.number, r.semitones, r.quality], [number, semitones, quality], JSON.stringify(args));
  }
});

test('identifyInterval is the inverse of build for every catalog interval', () => {
  for (const s of T.CATALOG.intervals) {
    for (let line = -2; line <= 4; line++) {
      for (const acc of [-1, 0, 1]) {
        const { notes } = T.build(s, { line, acc, clef: 'sol' });
        const r = T.identifyInterval(notes[0].letter, notes[0].acc, notes[1].letter, notes[1].acc, 'up');
        if (s.id === 'P8') {
          assert.strictEqual(r.number, 1); // בלי אוקטבות המחשבון רואה אוקטבה כפרימה
          continue;
        }
        assert.strictEqual(r.name, s.name, `${s.name} from ${notes[0].name}`);
      }
    }
  }
});

test('key signature lines', () => {
  assert.deepStrictEqual(T.keySignatureLines('fa', 1, 5), [6, 3, 7, 4, 1]);
  assert.deepStrictEqual(T.keySignatureLines('sol', -1, 2), [4, 7]);
});

test('svg helpers return paths', () => {
  const staff = { bottomY: 51, space: 8 };
  assert.ok(T.svg.clef('sol', 35, staff).startsWith('<path'));
  assert.ok(T.svg.accidental(-2, 100, 40, 8).includes('<path'));
  assert.strictEqual(T.svg.ledgerLines(50, -4, staff, 8).split('<line').length - 1, 2);
});

console.log(`all ${passed} tests passed`);
