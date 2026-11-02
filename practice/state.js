// תרגול: קבועים ומצב התרגיל הנוכחי. נטען ראשון; שאר הקבצים משתמשים במשתנים האלה.

const T = window.TheoryCore;
const STAFF = { bottomY: 66, space: 8 };

const NOTE_NAMES = T.LETTERS.map(l => ({ name: l.he, eng: l.en, pc: l.pc }));

const BASE_STRUCTURES = {};
Object.keys(T.CATALOG).forEach(type => {
  BASE_STRUCTURES[type] = T.CATALOG[type].map(s => ({ id: s.id, name: s.name, abbr: s.abbr, stepOffsets: s.steps, semitones: s.semitones }));
});

const INVERSIONS_DATA = {
  chords: [
    { id: 0, name: 'מצב יסודי' },
    { id: 1, name: 'היפוך ראשון' },
    { id: 2, name: 'היפוך שני' }
  ],
  septachords: [
    { id: 0, name: 'מצב יסודי' },
    { id: 1, name: 'היפוך ראשון' },
    { id: 2, name: 'היפוך שני' },
    { id: 3, name: 'היפוך שלישי' }
  ]
};


let audioCtx = null;
let currentExercise = null;
let currentScore = 0;
let selectedAccidental = '0';
let selectedChordType = null;
let selectedChordInv = null;
let selectedNoteNameIdx = null;
// תו שנבחר לפני סימן ההתק: נבדק שוב כשבוחרים סימן התק, כך שסדר הלחיצות לא משנה
let pendingLetter = null;
let modeRootGiven = false;
let selectedModeType = null;
let typeAnsweredCorrectly = false;
let exerciseSolved = false;
let currentPlayDirection = 'ascending';
// הרמזים שכבר הוצגו בתרגיל הנוכחי
let shownHints = new Set();
