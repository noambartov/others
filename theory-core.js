// theory-core.js — לוגיקת תורת המוזיקה המשותפת לכל הדפים באתר.
// סקריפט רגיל (לא module) כדי שהדפים יעבדו גם כשפותחים אותם ישירות מהמחשב.
// בדפדפן הכל זמין דרך window.TheoryCore, וב-Node דרך require('./theory-core.js').
(function (root) {
  'use strict';

  // ===== צלילים =====
  const LETTERS = [
    { he: 'דו', en: 'C', pc: 0 },
    { he: 'רה', en: 'D', pc: 2 },
    { he: 'מי', en: 'E', pc: 4 },
    { he: 'פה', en: 'F', pc: 5 },
    { he: 'סול', en: 'G', pc: 7 },
    { he: 'לה', en: 'A', pc: 9 },
    { he: 'סי', en: 'B', pc: 11 }
  ];

  // שורה 0 בחמשה = הקו התחתון. המספר הוא אינדקס דיאטוני מוחלט (אוקטבה * 7 + אות).
  // מפתח סול: הקו התחתון הוא מי 4. מפתח פה: הקו התחתון הוא סול 2.
  const CLEF_BOTTOM_LINE = { sol: 4 * 7 + 2, fa: 2 * 7 + 4 };

  function mod(n, m) { return ((n % m) + m) % m; }

  const ACC_SYMBOLS = { '-2': '♭♭', '-1': '♭', '0': '', '1': '♯', '2': '♯♯' };
  const ACC_WORDS = { '-2': ' במול כפול', '-1': ' במול', '0': '', '1': ' דיאז', '2': ' דיאז כפול' };

  function isSpellable(acc) { return acc >= -2 && acc <= 2; }

  // style: 'symbol' (רה♭) או 'word' (רה במול). היתק מעבר לכפול מסומן ב-? כדי שלא יוצג שם שגוי.
  function noteName(letter, acc, style) {
    const table = style === 'word' ? ACC_WORDS : ACC_SYMBOLS;
    const suffix = isSpellable(acc) ? table[acc] : '(?)';
    return LETTERS[letter].he + suffix;
  }

  // צליל לפי מיקום בחמשה
  function note(absLine, acc, clef) {
    const diatonic = CLEF_BOTTOM_LINE[clef] + absLine;
    const letter = mod(diatonic, 7);
    const octave = Math.floor(diatonic / 7);
    const midiNum = (octave + 1) * 12 + LETTERS[letter].pc + acc;
    return { absLine, acc, clef, letter, nameIndex: letter, octave, midiNum, name: noteName(letter, acc) };
  }

  // השורה בחמשה של אות מסוימת, בתוך טווח של 7 שורות שמתחיל ב-fromLine
  function lineForLetter(letter, clef, fromLine) {
    const start = CLEF_BOTTOM_LINE[clef] + fromLine;
    return fromLine + mod(letter - start, 7);
  }

  // ===== קטלוג המבנים =====
  // steps = מרחק בשורות מהשורש, semitones = מרחק בחצאי טונים מהשורש
  const S8 = [0, 1, 2, 3, 4, 5, 6, 7];
  const TRIAD = [0, 2, 4];
  const SEVENTH = [0, 2, 4, 6];

  const CATALOG = {
    intervals: [
      { id: 'P1', name: 'פרימה זכה', abbr: '1.ז', steps: [0, 0], semitones: [0, 0] },
      { id: 'm2', name: 'סקונדה קטנה', abbr: '2.ק', steps: [0, 1], semitones: [0, 1] },
      { id: 'M2', name: 'סקונדה גדולה', abbr: '2.ג', steps: [0, 1], semitones: [0, 2] },
      { id: 'A2', name: 'סקונדה מוגדלת', abbr: '2.מוג', steps: [0, 1], semitones: [0, 3] },
      { id: 'm3', name: 'טרצה קטנה', abbr: '3.ק', steps: [0, 2], semitones: [0, 3] },
      { id: 'M3', name: 'טרצה גדולה', abbr: '3.ג', steps: [0, 2], semitones: [0, 4] },
      { id: 'P4', name: 'קוורטה זכה', abbr: '4.ז', steps: [0, 3], semitones: [0, 5] },
      { id: 'A4', name: 'קוורטה מוגדלת', abbr: '4.מוג', steps: [0, 3], semitones: [0, 6] },
      { id: 'd5', name: 'קווינטה מוקטנת', abbr: '5.מוק', steps: [0, 4], semitones: [0, 6] },
      { id: 'P5', name: 'קווינטה זכה', abbr: '5.ז', steps: [0, 4], semitones: [0, 7] },
      { id: 'A5', name: 'קווינטה מוגדלת', abbr: '5.מוג', steps: [0, 4], semitones: [0, 8] },
      { id: 'm6', name: 'סקסטה קטנה', abbr: '6.ק', steps: [0, 5], semitones: [0, 8] },
      { id: 'M6', name: 'סקסטה גדולה', abbr: '6.ג', steps: [0, 5], semitones: [0, 9] },
      { id: 'm7', name: 'ספטימה קטנה', abbr: '7.ק', steps: [0, 6], semitones: [0, 10] },
      { id: 'M7', name: 'ספטימה גדולה', abbr: '7.ג', steps: [0, 6], semitones: [0, 11] },
      { id: 'P8', name: 'אוקטבה זכה', abbr: '8.ז', steps: [0, 7], semitones: [0, 12] }
    ],
    chords: [
      { id: 'major', name: 'מז׳ור', steps: TRIAD, semitones: [0, 4, 7] },
      { id: 'minor', name: 'מינור', steps: TRIAD, semitones: [0, 3, 7] },
      { id: 'augmented', name: 'מוגדל', steps: TRIAD, semitones: [0, 4, 8] },
      { id: 'diminished', name: 'מוקטן', steps: TRIAD, semitones: [0, 3, 6] }
    ],
    septachords: [
      { id: 'major7', name: 'מז׳ור גדול', steps: SEVENTH, semitones: [0, 4, 7, 11] },
      { id: 'dominant7', name: 'מז׳ור דומיננטי', steps: SEVENTH, semitones: [0, 4, 7, 10] },
      { id: 'minor7', name: 'מינור שבע', steps: SEVENTH, semitones: [0, 3, 7, 10] },
      { id: 'half_diminished', name: 'חצי מוקטן שבע', steps: SEVENTH, semitones: [0, 3, 6, 10] },
      { id: 'diminished7', name: 'מוקטן שבע', steps: SEVENTH, semitones: [0, 3, 6, 9] },
      { id: 'augmented7', name: 'מוגדל שבע', steps: SEVENTH, semitones: [0, 4, 8, 10] },
      { id: 'augmented_major7', name: 'מוגדל גדול', steps: SEVENTH, semitones: [0, 4, 8, 11] },
      { id: 'minor_major7', name: 'מינור שבע גדול', steps: SEVENTH, semitones: [0, 3, 7, 11] }
    ],
    scales: [
      { id: 'major', name: 'מז׳ור', steps: S8, semitones: [0, 2, 4, 5, 7, 9, 11, 12] },
      { id: 'minor_natural', name: 'מינור טבעי', steps: S8, semitones: [0, 2, 3, 5, 7, 8, 10, 12] },
      { id: 'minor_harmonic', name: 'מינור הרמוני', steps: S8, semitones: [0, 2, 3, 5, 7, 8, 11, 12] },
      { id: 'minor_melodic', name: 'מינור מלודי', steps: S8, semitones: [0, 2, 3, 5, 7, 9, 11, 12] }
    ],
    modes: [
      { id: 'ionian', name: 'יוני (מז׳ור)', steps: S8, semitones: [0, 2, 4, 5, 7, 9, 11, 12] },
      { id: 'dorian', name: 'דורי', steps: S8, semitones: [0, 2, 3, 5, 7, 9, 10, 12] },
      { id: 'phrygian', name: 'פריגי', steps: S8, semitones: [0, 1, 3, 5, 7, 8, 10, 12] },
      { id: 'lydian', name: 'לידי', steps: S8, semitones: [0, 2, 4, 6, 7, 9, 11, 12] },
      { id: 'mixolydian', name: 'מיקסולידי', steps: S8, semitones: [0, 2, 4, 5, 7, 9, 10, 12] },
      { id: 'aeolian', name: 'אאולי (מינור טבעי)', steps: S8, semitones: [0, 2, 3, 5, 7, 8, 10, 12] },
      { id: 'locrian', name: 'לוקרי', steps: S8, semitones: [0, 1, 3, 5, 6, 8, 10, 12] }
    ]
  };

  const INVERSIONS = {
    chords: ['מצב יסודי', 'היפוך ראשון', 'היפוך שני'],
    septachords: ['מצב יסודי', 'היפוך ראשון', 'היפוך שני', 'היפוך שלישי']
  };

  function findStructure(type, id) {
    return CATALOG[type].find(s => s.id === id || s.name === id);
  }

  // ===== בניית מבנה (מרווח / אקורד / סולם) על החמשה =====
  // given: 'root' — הצליל הנתון הוא השורש, וההיפוך מעביר צלילים אוקטבה למעלה
  //        'bass' — הצליל הנתון הוא הצליל הנמוך אחרי ההיפוך
  //        'soprano' — הצליל הנתון הוא הצליל הגבוה אחרי ההיפוך
  function build(struct, opts) {
    const clef = opts.clef;
    const inversion = opts.inversion || 0;
    const given = opts.given || 'root';
    const n = struct.steps.length;

    const rotSteps = [];
    const rotSemis = [];
    for (let i = 0; i < n; i++) {
      const orig = (i + inversion) % n;
      const wraps = orig < inversion;
      rotSteps.push(struct.steps[orig] + (wraps ? 7 : 0));
      rotSemis.push(struct.semitones[orig] + (wraps ? 12 : 0));
    }

    const givenMidi = note(opts.line, opts.acc, clef).midiNum;
    let rootLine, rootMidi;
    if (given === 'root') {
      rootLine = opts.line;
      rootMidi = givenMidi;
    } else {
      const idx = given === 'soprano' ? n - 1 : 0;
      rootLine = opts.line - rotSteps[idx];
      rootMidi = givenMidi - rotSemis[idx];
    }

    const notes = rotSteps.map((step, i) => {
      const line = rootLine + step;
      const natural = note(line, 0, clef).midiNum;
      return note(line, rootMidi + rotSemis[i] - natural, clef);
    });
    const rootAcc = rootMidi - note(rootLine, 0, clef).midiNum;
    return { notes, root: note(rootLine, rootAcc, clef) };
  }

  // ===== זיהוי מרווח בין שני צלילים (בלי אוקטבות, כמו במחשבון) =====
  const NUMBER_NAMES = ['פרימה', 'סקונדה', 'טרצה', 'קוורטה', 'קווינטה', 'סקסטה', 'ספטימה', 'אוקטבה'];
  const REFERENCE_SEMITONES = [0, 2, 4, 5, 7, 9, 11, 12];
  const PERFECT_NUMBERS = [1, 4, 5, 8];
  const PERFECT_QUALITIES = { '-2': 'מוקטנת כפולה', '-1': 'מוקטנת', '0': 'זכה', '1': 'מוגדלת', '2': 'מוגדלת כפולה' };
  const IMPERFECT_QUALITIES = { '-3': 'מוקטנת כפולה', '-2': 'מוקטנת', '-1': 'קטנה', '0': 'גדולה', '1': 'מוגדלת', '2': 'מוגדלת כפולה' };

  function intervalQuality(number, semitones) {
    const diff = semitones - REFERENCE_SEMITONES[number - 1];
    const table = PERFECT_NUMBERS.includes(number) ? PERFECT_QUALITIES : IMPERFECT_QUALITIES;
    return table[diff] || null;
  }

  // direction: 'up' — הצליל השני מעל הראשון, 'down' — הצליל השני מתחת לראשון.
  // צליל זהה פעמיים = פרימה. כשהשני "נמוך" מהראשון באותה אות, זו אוקטבה.
  function identifyInterval(letter1, acc1, letter2, acc2, direction) {
    const [lowL, lowA, highL, highA] = direction === 'down'
      ? [letter2, acc2, letter1, acc1]
      : [letter1, acc1, letter2, acc2];
    let steps = mod(highL - lowL, 7);
    let semitones = mod(LETTERS[highL].pc - LETTERS[lowL].pc, 12) + highA - lowA;
    if (steps === 0 && semitones < 0) {
      steps = 7;
      semitones += 12;
    }
    const number = steps + 1;
    const quality = intervalQuality(number, semitones);
    return {
      number,
      semitones,
      quality,
      name: NUMBER_NAMES[number - 1] + ' ' + (quality || 'לא סטנדרטית')
    };
  }

  // ===== סולמות וסימני מפתח =====
  const KEYS = [
    { accCount: 0, accType: 0, major: [0, 0], minor: [5, 0] },
    { accCount: 1, accType: 1, major: [4, 0], minor: [2, 0] },
    { accCount: 2, accType: 1, major: [1, 0], minor: [6, 0] },
    { accCount: 3, accType: 1, major: [5, 0], minor: [3, 1] },
    { accCount: 4, accType: 1, major: [2, 0], minor: [0, 1] },
    { accCount: 5, accType: 1, major: [6, 0], minor: [4, 1] },
    { accCount: 6, accType: 1, major: [3, 1], minor: [1, 1] },
    { accCount: 1, accType: -1, major: [3, 0], minor: [1, 0] },
    { accCount: 2, accType: -1, major: [6, -1], minor: [4, 0] },
    { accCount: 3, accType: -1, major: [2, -1], minor: [0, 0] },
    { accCount: 4, accType: -1, major: [5, -1], minor: [3, 0] },
    { accCount: 5, accType: -1, major: [1, -1], minor: [6, -1] },
    { accCount: 6, accType: -1, major: [4, -1], minor: [2, -1] }
  ].map(k => Object.assign(k, {
    name: noteName(k.major[0], k.major[1]) + ' מז׳ור / ' + noteName(k.minor[0], k.minor[1]) + ' מינור'
  }));

  // שורות סימני המפתח לפי הסדר (פה דו סול רה לה מי סי / סי מי לה רה סול דו פה)
  const KEY_SIGNATURE_LINES = {
    sol: { sharp: [8, 5, 9, 6, 3, 7, 4], flat: [4, 7, 3, 6, 2, 5, 1] },
    fa: { sharp: [6, 3, 7, 4, 1, 5, 2], flat: [2, 5, 1, 4, 0, 3, -1] }
  };

  function keySignatureLines(clef, accType, accCount) {
    const set = KEY_SIGNATURE_LINES[clef][accType === 1 ? 'sharp' : 'flat'];
    return set.slice(0, accCount);
  }

  // ===== ציור בחמשה (SVG) =====
  // צורות מתוך הגופן Bravura (SIL Open Font License, Steinberg Media Technologies).
  // הנתיבים מוטמעים כאן ולא נטענים כגופן, כדי שיופיעו גם בייצוא ל-PDF.
  // יחידות הגופן: 250 יחידות = רווח אחד בין קווי החמשה. ציר ה-Y הפוך.
  const GLYPHS = {
    gClef: { w: 671, d: 'M376 415C374 427 376 428 382 434C398 449 419 470 438 491C522 583 572 702 572 815C572 902 548 988 507 1048C492 1070 466 1098 455 1098C441 1098 410 1072 390 1050C316 968 292 843 292 739C292 681 299 616 306 575C308 563 309 561 297 551C233 498 164 437 112 373C43 287 0 194 0 87C0 -87 119 -252 364 -252C387 -252 413 -250 433 -246C444 -244 446 -243 448 -255C460 -322 475 -409 475 -456C475 -604 375 -622 316 -622C262 -622 236 -606 236 -593C236 -586 245 -583 268 -576C299 -567 335 -540 335 -482C335 -427 300 -380 239 -380C172 -380 132 -433 132 -495C132 -560 171 -658 322 -658C389 -658 519 -628 519 -458C519 -401 501 -306 490 -244C488 -232 489 -233 503 -227C604 -187 671 -102 671 11C671 139 577 252 430 252C404 252 404 252 401 270ZM470 943C503 943 530 916 530 861C530 792 497 728 419 650C403 634 379 611 356 591C349 585 345 586 343 599C339 625 337 659 337 691C337 847 409 943 470 943ZM361 262C364 243 364 244 346 238C258 208 201 129 201 44C201 -46 248 -110 316 -133C324 -136 336 -139 343 -139C351 -139 355 -134 355 -128C355 -121 347 -118 340 -115C298 -97 268 -54 268 -8C268 49 307 92 368 109C384 113 386 112 388 101L438 -197C440 -208 439 -208 424 -211C408 -214 388 -216 368 -216C193 -216 80 -119 80 20C80 79 90 158 173 252C233 319 279 356 326 394C336 402 338 401 340 390ZM430 103C428 115 429 118 441 117C522 110 589 42 589 -46C589 -109 551 -160 495 -188C483 -194 481 -194 479 -182Z' },
    fClef: { w: 684, d: 'M252 262C78 262 0 135 0 39C0 -41 42 -110 123 -110C186 -110 229 -66 229 -4C229 60 182 100 133 100C106 100 96 93 83 93C70 93 67 101 67 111C67 151 127 224 229 224C335 224 381 120 381 -37C381 -140 359 -260 297 -356C237 -449 134 -534 10 -605C1 -610 -5 -615 -5 -623C-5 -629 -1 -635 8 -635C13 -635 19 -633 25 -630C158 -565 286 -489 392 -375C479 -281 531 -159 531 -28C531 146 425 262 252 262ZM629 180C598 180 574 156 574 125C574 94 598 70 629 70C660 70 684 94 684 125C684 156 660 180 629 180ZM630 -71C599 -71 576 -94 576 -125C576 -156 599 -179 630 -179C661 -179 684 -156 684 -125C684 -94 661 -71 630 -71Z' },
    flat: { w: 226, d: 'M12 -170C15 -174 18 -175 21 -175C24 -175 27 -173 27 -173C57 -156 81 -129 106 -112C195 -50 226 11 226 57C226 114 182 150 136 153C129 153 122 152 115 150C104 147 92 143 81 136C75 131 64 122 59 122C57 122 56 122 54 123C47 126 43 133 43 140C44 162 50 402 50 422C50 433 41 439 31 439C17 439 1 429 0 411C0 411 4 -160 12 -170ZM47 -81C47 -81 44 -21 44 19C44 35 45 47 46 51C50 63 76 85 90 93C99 98 108 100 116 100C126 100 135 96 141 89C151 78 157 61 157 42C157 24 152 3 140 -18C127 -42 98 -74 68 -93C64 -95 61 -96 58 -96C49 -96 47 -86 47 -81Z' },
    natural: { w: 168, d: 'M141 181C139 181 138 180 137 180C137 180 73 157 47 157C41 157 37 158 37 162V329C37 336 31 341 25 341H12C5 341 0 336 0 329V-186C0 -192 3 -195 8 -195C9 -195 11 -194 12 -194C12 -194 14 -194 15 -193C29 -187 85 -163 114 -163C124 -163 131 -166 131 -174V-323C131 -330 136 -335 143 -335H156C162 -335 168 -330 168 -323V179C168 184 164 187 160 187C159 187 157 187 156 186ZM37 39C37 53 98 79 122 79C128 79 131 78 131 74V-29C131 -47 74 -70 49 -70C42 -70 37 -68 37 -64Z' },
    sharp: { w: 249, d: 'M237 118C244 121 249 129 249 135V206C249 211 246 214 242 214C240 214 239 214 237 213C237 213 217 205 212 204C205 204 198 209 198 217V339C198 345 192 350 184 350C174 350 168 345 168 339V209C167 199 164 186 155 180C143 173 109 159 92 155C83 155 80 167 80 175V295C80 301 73 306 66 306C56 306 50 301 50 295V160C50 146 44 136 38 133C32 130 12 122 12 122C5 120 0 112 0 106V35C0 29 3 26 8 26C9 26 11 27 12 27C12 27 27 33 34 37C35 37 36 38 37 38C44 38 50 28 50 20V-79C50 -90 45 -99 39 -102C33 -104 12 -113 12 -113C5 -115 0 -123 0 -129V-200C0 -206 3 -209 8 -209C9 -209 11 -208 12 -208C12 -208 26 -202 35 -199C36 -198 37 -198 38 -198C45 -198 50 -209 50 -214V-337C50 -343 56 -348 63 -348C73 -348 80 -343 80 -337V-198C80 -185 85 -178 90 -176L151 -151C152 -151 154 -150 155 -150C163 -150 168 -162 168 -168V-293C168 -299 174 -304 181 -304C192 -304 198 -299 198 -293V-151C198 -143 202 -131 209 -128C216 -125 237 -117 237 -117C244 -114 249 -106 249 -100V-29C249 -24 246 -21 242 -21C240 -21 239 -21 237 -22L211 -32C205 -32 198 -26 198 -14V79C198 86 203 105 211 108ZM168 -45C162 -65 115 -85 92 -85C86 -85 81 -83 80 -80C78 -76 77 -54 77 -30C77 1 78 36 80 44C82 61 128 82 153 82C160 82 166 80 168 76C170 71 172 46 172 19C172 -8 170 -36 168 -45Z' },
    doubleSharp: { w: 247, d: 'M190 -32C179 -26 143 -6 143 1C143 15 176 30 190 35C194 35 198 34 202 34C218 34 233 38 240 44C245 49 247 64 247 80C247 97 244 115 240 120C236 125 220 127 203 127C185 127 167 125 162 120C158 117 157 99 157 81C152 70 136 34 124 34C110 34 94 67 90 81C90 98 87 116 82 120C78 125 62 127 46 127C29 127 11 125 5 120C2 118 0 101 0 83C0 65 2 47 5 44C12 38 30 34 47 34C51 34 54 35 57 35C68 29 104 9 104 2C104 -11 72 -27 58 -32H48C30 -32 11 -34 5 -39C2 -42 0 -59 0 -77C0 -95 2 -113 5 -115C12 -121 28 -125 45 -125C60 -125 76 -122 82 -115C88 -110 90 -93 90 -77C90 -76 91 -74 92 -73C98 -59 110 -31 123 -31C136 -31 153 -63 157 -77C157 -95 158 -112 162 -115C169 -121 185 -125 202 -125C218 -125 233 -122 240 -115C245 -110 247 -95 247 -79C247 -62 244 -44 240 -39C235 -34 217 -32 200 -32Z' },
    doubleFlat: { w: 411, d: 'M314 151C309 151 305 151 300 150C288 147 277 141 267 135C260 131 252 122 243 122C241 122 239 122 238 123C231 125 228 132 228 140C228 161 234 402 234 421C234 432 225 437 215 437C202 437 186 428 184 411C184 411 185 274 187 135C172 145 155 151 136 151H130C125 151 120 151 116 150C104 147 93 141 83 135C75 131 68 122 59 122C57 122 56 122 54 123C47 125 43 132 43 140C43 161 50 402 50 421C50 432 41 437 31 437C17 437 1 428 0 411C0 411 5 -161 12 -170C15 -174 18 -175 21 -175C24 -175 27 -173 27 -173C58 -157 83 -129 106 -112C143 -86 171 -59 190 -35C192 -110 194 -167 197 -170C200 -174 203 -175 205 -175C208 -175 211 -173 211 -173C242 -157 266 -129 289 -113C379 -50 411 11 411 57C411 113 367 150 320 151ZM141 -18C128 -42 99 -73 67 -93C64 -95 60 -96 58 -96C50 -96 47 -86 47 -80C47 -80 44 -21 44 18C44 34 45 46 46 50C50 63 77 85 91 93C100 98 109 100 117 100C127 100 135 97 141 90C151 78 157 61 157 41C157 23 152 2 141 -18ZM324 -18C312 -42 283 -73 251 -93C247 -95 244 -96 242 -96C234 -96 231 -86 231 -80C231 -80 228 -11 228 27C228 38 228 47 229 50C233 63 260 85 275 93C284 98 293 100 301 100C311 100 319 97 325 90C334 78 340 61 340 41C340 23 335 3 324 -18Z' },
    noteheadBlack: { w: 295, d: 'M97 -125C186 -125 295 -43 295 42C295 93 255 125 198 125C88 125 0 44 0 -42C0 -94 43 -125 97 -125Z' }
  };

  const ACC_GLYPHS = { '-2': 'doubleFlat', '-1': 'flat', '0': 'natural', '1': 'sharp', '2': 'doubleSharp' };

  function glyph(name, x, y, space, fill) {
    const s = (space / 250).toFixed(5);
    return `<path d="${GLYPHS[name].d}" transform="translate(${x} ${y}) scale(${s} -${s})" fill="${fill || 'currentColor'}"/>`;
  }

  function glyphWidth(name, space) {
    return GLYPHS[name].w * space / 250;
  }

  // staff = { bottomY, space } — ה-Y של הקו התחתון והמרחק בין קווים
  function lineY(staff, absLine) {
    return staff.bottomY - absLine * staff.space / 2;
  }

  // מפתח שמרכזו ב-centerX
  function clefSvg(clef, centerX, staff, fill) {
    const name = clef === 'fa' ? 'fClef' : 'gClef';
    const anchorLine = clef === 'fa' ? 6 : 2;
    const x = centerX - glyphWidth(name, staff.space) / 2;
    return glyph(name, x, lineY(staff, anchorLine), staff.space, fill);
  }

  // סימן היתק שהקצה הימני שלו ב-rightX
  function accidentalSvg(acc, rightX, y, space, fill) {
    const name = ACC_GLYPHS[acc];
    if (!name) return '';
    return glyph(name, rightX - glyphWidth(name, space), y, space, fill);
  }

  function noteheadSvg(centerX, y, space, fill) {
    return glyph('noteheadBlack', centerX - glyphWidth('noteheadBlack', space) / 2, y, space, fill);
  }

  function ledgerLinesSvg(centerX, absLine, staff, halfWidth, stroke) {
    let out = '';
    const lines = [];
    for (let l = -2; l >= absLine; l -= 2) lines.push(l);
    for (let l = 10; l <= absLine; l += 2) lines.push(l);
    lines.forEach(l => {
      const y = lineY(staff, l);
      out += `<line x1="${centerX - halfWidth}" y1="${y}" x2="${centerX + halfWidth}" y2="${y}" stroke="${stroke || 'currentColor'}" stroke-width="1.2"/>`;
    });
    return out;
  }

  const TheoryCore = {
    LETTERS, CATALOG, INVERSIONS, KEYS,
    mod, isSpellable, noteName, note, lineForLetter, findStructure, build,
    intervalQuality, identifyInterval, keySignatureLines,
    svg: { GLYPHS, glyph, glyphWidth, lineY, clef: clefSvg, accidental: accidentalSvg, notehead: noteheadSvg, ledgerLines: ledgerLinesSvg }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TheoryCore;
  else root.TheoryCore = TheoryCore;
})(typeof window !== 'undefined' ? window : this);
