// בדיקות ממשק בדפדפן אמיתי (Chromium דרך Playwright), במסך מחשב ובמסך טלפון.
// הרצה: node --test tests/ui.test.js   (או: npm test)
// כל בדיקה נכשלת אם בדף נזרקה שגיאת JavaScript.
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require('playwright');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };

let server, base, browser;
// השהיה של כל תשובה מהשרת, כדי לבדוק רשת חלשה
let serverDelayMs = 0;

before(async () => {
  server = http.createServer(async (req, res) => {
    if (serverDelayMs) await new Promise(r => setTimeout(r, serverDelayMs));
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(ROOT, url === '/' ? 'index.html' : url);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
});

after(async () => {
  if (browser) await browser.close();
  if (server) server.close();
});

const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 800 } },
  mobile: { ...devices['iPhone 13'], defaultBrowserType: undefined },
};

// דף חדש עם רישום שגיאות. האתר לא אמור לטעון שום דבר מאתר אחר (גופנים וספריות PDF מאוחסנים באתר),
// ולכן כל בקשה החוצה נחסמת ונרשמת כשגיאה. ה-service worker כבוי כאן ונבדק בנפרד למטה.
async function openPage(viewport, file, storage = {}, { serviceWorkers = 'block' } = {}) {
  const { defaultBrowserType, ...opts } = VIEWPORTS[viewport];
  const context = await browser.newContext({ ...opts, locale: 'he-IL', serviceWorkers });
  const errors = [];
  await context.route(url => !url.href.startsWith(base), route => {
    errors.push('request outside the site: ' + route.request().url());
    route.abort();
  });
  await context.addInitScript(items => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
  }, storage);
  context.setDefaultTimeout(8000);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => { errors.push('unexpected dialog: ' + d.message()); d.dismiss(); });
  page.on('console', m => {
    if (m.type() !== 'error') return;
    errors.push('console: ' + m.text() + (m.location().url ? ' @ ' + m.location().url : ''));
  });
  await page.goto(base + file);
  return { page, context, errors, close: () => context.close() };
}

function noErrors(errors) {
  assert.deepStrictEqual(errors, [], 'errors in page:\n' + errors.join('\n'));
}

// ---------- דפי האתר נטענים ----------
for (const vp of Object.keys(VIEWPORTS)) {
  describe(`pages load (${vp})`, () => {
    test('home page links to every section', async () => {
      const { page, errors, close } = await openPage(vp, 'index.html');
      for (const href of ['music_theory_exercise_tool.html', 'music_theory_worksheets_generator.html', 'rhythm_practice.html']) {
        assert.ok(await page.locator(`a[href*="${href}"]`).count() > 0, 'missing link to ' + href);
      }
      noErrors(errors);
      await close();
    });

    test('worksheets: generate a sheet and the answers page', async () => {
      const { page, errors, close } = await openPage(vp, 'music_theory_worksheets_generator.html');
      await page.locator('.btn-generate').click();
      await page.waitForFunction(() => document.getElementById('stavesContainer').children.length > 0
        && document.getElementById('answersStavesContainer').children.length > 0);
      await page.locator('.btn-answers').click();
      const download = page.waitForEvent('download', { timeout: 30000 });
      await page.locator('.btn-pdf').click();
      const file = await (await download).path();
      assert.ok(fs.readFileSync(file).subarray(0, 5).toString() === '%PDF-', 'a PDF was downloaded');
      noErrors(errors);
      await close();
    });

    test('calculator: every tab calculates', async () => {
      const { page, errors, close } = await openPage(vp, 'music_theory_algorythm.html');
      const tabs = page.locator('.tab-btn');
      for (let i = 0; i < await tabs.count(); i++) {
        await tabs.nth(i).click();
        await page.locator('.calc-btn:visible').first().click();
      }
      noErrors(errors);
      await close();
    });
  });
}

// ---------- תרגול: כל סוג תרגיל נטען, מנגן ומקבל תשובה נכונה ----------

// לוחץ על התשובה הנכונה כמו משתמש, לפי התרגיל שעל המסך
async function answerCorrectly(page) {
  const ex = await page.evaluate(() => ({
    type: currentExercise.type,
    name: currentExercise.struct ? currentExercise.struct.name : null,
    inversion: currentExercise.inversion,
    root: currentExercise.notes[0] && { nameIndex: currentExercise.notes[0].nameIndex, acc: currentExercise.notes[0].acc },
    note: currentExercise.correctNote && { nameIndex: currentExercise.correctNote.nameIndex, acc: currentExercise.correctNote.acc },
  }));
  const click = sel => page.locator(sel).click();
  const acc = (prefix, a) => a < 0 ? click(`#${prefix}Flat`) : a > 0 ? click(`#${prefix}Sharp`) : null;

  if (ex.type === 'progressions') {
    const q = await page.evaluate(() => ({ kind: currentExercise.kind, tokens: currentExercise.prog.tokens, ending: currentExercise.prog.ending }));
    if (q.kind === 'cad') await click(`#progButtons .opt-btn[data-name="${await page.evaluate(e => HarmonyCore.CADENCES[e], q.ending)}"]`);
    else {
      // כותבים בכל משבצת פתוחה את האקורד הנכון, ואז "בדיקה"
      for (let i = await page.evaluate(() => progIndex); i >= 0; i = await page.evaluate(() => progIndex)) {
        await click(`#progButtons .opt-btn[data-token="${q.tokens[i]}"]`);
      }
      await click('#progSub .prog-check');
    }
  } else if (ex.type === 'note_id') {
    await acc('acc', ex.note.acc);
    await page.locator('#noteNameButtons .opt-btn').nth(ex.note.nameIndex).click();
  } else if (ex.type === 'chords' || ex.type === 'septachords') {
    await click(`#chordTypeButtons .opt-btn[data-name="${ex.name}"]`);
    const inv = page.locator(`#chordInvButtons .opt-btn[data-inv="${ex.inversion}"]`);
    if (await inv.isVisible()) await inv.click();
  } else if (ex.type === 'scales' || ex.type === 'modes') {
    if (await page.locator('#modeNoteNameButtons').isVisible()) {
      await acc('modeAcc', ex.root.acc);
      await page.locator('#modeNoteNameButtons .opt-btn').nth(ex.root.nameIndex).click();
    }
    await click(`#modeTypeButtons .opt-btn[data-name="${ex.name}"]`);
  } else {
    await click(`#optionsButtons .opt-btn[data-name="${ex.name}"]`);
  }
  await page.waitForFunction(() => document.getElementById('feedback').classList.contains('success') && exerciseSolved);
}

// אחרי תשובה נכונה מגיע תרגיל חדש (ואם נפתח שיר חדש באוסף, ממשיכים ממנו)
async function waitForNextExercise(page) {
  await page.waitForFunction(() => {
    const dlg = document.getElementById('rewardDialog');
    return !exerciseSolved || (dlg && !dlg.hidden);
  }, null, { timeout: 8000 });
  if (await page.locator('#rewardDialog:not([hidden])').count()) {
    await page.locator('#rewardDialog .primary').click();
    await page.waitForFunction(() => !exerciseSolved, null, { timeout: 8000 });
  }
}

async function audioWorks(page) {
  return page.evaluate(async () => {
    const ctx = getAudioContext();
    if (ctx.state !== 'running') await ctx.resume();
    return ctx.state;
  });
}

const READ_TYPES = ['note_id', 'intervals', 'chords', 'septachords', 'scales', 'modes'];
const EAR_TYPES = ['intervals', 'chords', 'septachords', 'scales', 'modes', 'progressions'];

for (const vp of Object.keys(VIEWPORTS)) {
  describe(`practice (${vp})`, () => {
    for (const type of READ_TYPES) {
      test(`reading: ${type}`, async () => {
        const { page, errors, close } = await openPage(vp, 'music_theory_exercise_tool.html', { mt_app_mode: 'read' });
        await page.locator(`#exTypeRow button[data-type="${type}"]`).click();
        assert.strictEqual(await page.evaluate(() => currentExercise.type), type);
        assert.ok(await page.locator('#staffSvg').isVisible(), 'staff is visible');
        assert.ok(await page.locator('#staffSvg *').count() > 5, 'staff has notes drawn');
        if (type !== 'note_id') {
          await page.locator('#playAudioBtn').click();
          assert.strictEqual(await audioWorks(page), 'running');
        }
        for (let i = 0; i < 3; i++) {
          await answerCorrectly(page);
          await waitForNextExercise(page);
        }
        noErrors(errors);
        await close();
      });
    }

    for (const type of EAR_TYPES) {
      test(`ear: ${type}`, async () => {
        const { page, errors, close } = await openPage(vp, 'music_theory_exercise_tool.html', { mt_app_mode: 'ear' });
        await page.locator(`#exTypeRow button[data-type="${type}"]`).click();
        assert.strictEqual(await page.evaluate(() => currentExercise.type), type);
        assert.ok(await page.locator('.big-play').isVisible(), 'big play button visible');
        assert.ok(!(await page.locator('#staffContainer').isVisible()), 'staff hidden in ear mode');
        await page.locator('.big-play').click();
        assert.strictEqual(await audioWorks(page), 'running');
        await page.locator('#helpBtn').click();
        assert.ok(await page.locator('#helpPopover.visible').count() || await page.evaluate(() => helpUsed), 'help gives a hint');
        for (let i = 0; i < 2; i++) {
          await answerCorrectly(page);
          await waitForNextExercise(page);
        }
        noErrors(errors);
        await close();
      });
    }

    test('alto clef in reading: notes, intervals and the C clef glyph', async () => {
      const { page, errors, close } = await openPage(vp, 'music_theory_exercise_tool.html', { mt_app_mode: 'read' });
      for (const type of ['note_id', 'intervals']) {
        await page.locator(`#exTypeRow button[data-type="${type}"]`).click();
        await page.locator('#settingsCollapse summary').click();
        await page.locator('#clefSelect + .seg button[data-value="alto"]').click();
        await page.locator('#settingsCollapse summary').click();
        await page.waitForFunction(() => currentExercise && currentExercise.clef === 'alto');
        const usesCClef = await page.evaluate(() => document.getElementById('staffSvg').innerHTML.includes(TheoryCore.svg.GLYPHS.cClef.d.slice(0, 40)));
        assert.ok(usesCClef, 'C clef drawn');
        await answerCorrectly(page);
        await waitForNextExercise(page);
        assert.strictEqual(await page.evaluate(() => currentExercise.clef), 'alto');
      }
      noErrors(errors);
      await close();
    });

    test('reading scales by key signature only: major or relative minor both count', async () => {
      const { page, errors, close } = await openPage(vp, 'music_theory_exercise_tool.html', { mt_app_mode: 'read' });
      await page.locator('#exTypeRow button[data-type="scales"]').click();
      await page.locator('#settingsCollapse summary').click();
      await page.locator('#scaleShowGroup .seg button[data-value="keysig"]').click();
      assert.ok(!(await page.locator('#optionsGroup').isVisible()), 'scale list hidden');
      await page.locator('#settingsCollapse summary').click();
      await page.waitForFunction(() => currentExercise && currentExercise.keySig);
      assert.ok(!(await page.locator('#playAudioBtn').isVisible()), 'no play button');
      for (const pick of [0, 1, 1, 0]) {
        const a = await page.evaluate(i => {
          const x = currentExercise.answers[i];
          return { nameIndex: x.nameIndex, acc: x.acc, name: x.struct.name, count: currentExercise.keySig.accCount };
        }, pick);
        const drawn = await page.locator('#staffSvg path').count();
        assert.strictEqual(drawn, 1 + a.count, 'clef plus key signature, no notes');
        // סדר הפוך בפעם השנייה: קודם הסוג ואז הצליל
        if (pick === 1) await page.locator(`#modeTypeButtons .opt-btn[data-name="${a.name}"]`).click();
        if (a.acc) await page.locator(a.acc < 0 ? '#modeAccFlat' : '#modeAccSharp').click();
        await page.locator('#modeNoteNameButtons .opt-btn').nth(a.nameIndex).click();
        if (pick === 0) await page.locator(`#modeTypeButtons .opt-btn[data-name="${a.name}"]`).click();
        await page.waitForFunction(() => document.getElementById('feedback').classList.contains('success') && exerciseSolved);
        await waitForNextExercise(page);
      }
      noErrors(errors);
      await close();
    });

    test('ear: a wrong answer offers to hear the choice, and the collection lists what is confusing', async () => {
      const { page, errors, close } = await openPage(vp, 'music_theory_exercise_tool.html', { mt_app_mode: 'ear' });
      await page.locator('#exTypeRow button[data-type="intervals"]').click();
      await page.locator('.big-play').click();
      for (let i = 0; i < 2; i++) {
        const right = await page.evaluate(() => currentExercise.struct.name);
        await page.locator(`#optionsButtons .opt-btn:not([data-name="${right}"])`).first().click();
        await page.locator('#feedback .hear-choice').click();
        await answerCorrectly(page);
        await waitForNextExercise(page);
      }
      const hist = await page.evaluate(() => Rewards._load().hist);
      assert.strictEqual(hist.length, 2);
      assert.ok(hist.every(e => e.k === 'ear:intervals' && !e.ok && e.c), 'first wrong choice kept');
      await page.locator('#rewardChip').click();
      assert.ok(await page.locator('.report-section', { hasText: 'איפה קשה לי' }).isVisible());
      noErrors(errors);
      await close();
    });

    test('harmonic progressions: chord by chord, hear a wrong choice, cadences, all stages fit the screen', async () => {
      const { page, errors, close } = await openPage(vp, 'music_theory_exercise_tool.html', { mt_app_mode: 'ear' });
      await page.locator('#exTypeRow button[data-type="progressions"]').click();
      const first = await page.evaluate(() => currentExercise.prog.chords[0].text);
      assert.match(first, /^(I|i)⁶?$/, 'first chord is the tonic');
      assert.match(await page.locator('#progSlots .prog-slot.given').textContent(), /^(I|i)6?$/);
      // כותבים הכול, עם טעות במשבצת השנייה, ובודקים: הטעות מסומנת, אפשר לשמוע מה שנכתב, והמשבצת פתוחה לתיקון
      const tokens = await page.evaluate(() => currentExercise.prog.tokens);
      const wrong = await page.evaluate(r => [...document.querySelectorAll('#progButtons .opt-btn')].map(b => b.dataset.token).find(t => t !== r), tokens[1]);
      await page.locator(`#progButtons .opt-btn[data-token="${wrong}"]`).click();
      for (let i = 2; i < tokens.length; i++) await page.locator(`#progButtons .opt-btn[data-token="${tokens[i]}"]`).click();
      assert.strictEqual(await page.evaluate(() => exerciseSolved), false, 'nothing is checked before "בדיקה"');
      await page.locator('#progSub .prog-check').click();
      assert.ok(await page.locator('#progSlots .prog-slot.wrong').count() === 1, 'the wrong chord is marked');
      assert.strictEqual(await page.evaluate(() => progIndex), 1, 'the wrong slot is open again');
      await page.locator('#feedback .hear-choice').click();
      await page.locator(`#progButtons .opt-btn[data-token="${tokens[1]}"]`).click();
      // עזרה: לאט, קו הבס, משפחה, ואז התשובה בספרות רומיות
      for (let i = 0; i < 4; i++) await page.locator('#helpBtn').click();
      assert.match(await page.locator('#helpPopover').textContent(), /–/);
      await page.locator('#progSub .prog-check').click();
      await waitForNextExercise(page);
      await page.locator('#settingsCollapse summary').click();
      for (const id of ['progStageGroup', 'progModeGroup', 'progAskGroup']) assert.ok(await page.locator('#' + id).isVisible(), id);
      assert.ok(!(await page.locator('#optionsGroup').isVisible()), 'no options list for progressions');
      await page.locator('#progStageGroup .seg button[data-value="9"]').click();
      await page.locator('#settingsCollapse summary').click();
      await page.waitForFunction(() => currentExercise.stage === 9);
      const bar = await page.locator('.action-bar').boundingBox();
      const vh = page.viewportSize().height;
      assert.ok(bar.y + bar.height <= vh, `action bar visible with all stage 9 chords (${bar.y + bar.height} > ${vh})`);
      await answerCorrectly(page);
      await waitForNextExercise(page);
      await page.locator('#settingsCollapse summary').click();
      await page.locator('#progAskGroup .seg button[data-value="cad"]').click();
      await page.locator('#settingsCollapse summary').click();
      await page.waitForFunction(() => currentExercise.kind === 'cad');
      assert.ok(await page.locator('#progQuestion').isVisible(), 'cadence question');
      assert.ok(await page.locator('#progButtons .opt-btn', { hasText: 'קדנצה מדומה' }).count(), 'deceptive cadence offered at stage 9');
      await answerCorrectly(page);
      await waitForNextExercise(page);
      noErrors(errors);
      await close();
    });

    test('harmonic progressions in step-by-step training: own group of stages, confusions in the report', async () => {
      const { page, errors, close } = await openPage(vp, 'music_theory_exercise_tool.html', { mt_app_mode: 'train' });
      assert.match(await page.locator('#trainingPanel .level-group').textContent(), /מהלכים הרמוניים/);
      const stage = await page.evaluate(() => EAR_LEVELS.findIndex(l => l.group) + 3);
      await page.locator('#trainingPanel .level-item').nth(stage).click();
      assert.strictEqual(await page.evaluate(() => currentExercise.type), 'progressions');
      const q = await page.evaluate(() => ({ kind: currentExercise.kind, tokens: currentExercise.prog.tokens }));
      if (q.kind === 'prog') {
        const wrong = await page.evaluate(r => [...document.querySelectorAll('#progButtons .opt-btn')].map(b => b.dataset.token).find(t => t !== r), q.tokens[1]);
        await page.locator(`#progButtons .opt-btn[data-token="${wrong}"]`).click();
        for (let i = 2; i < q.tokens.length; i++) await page.locator(`#progButtons .opt-btn[data-token="${q.tokens[i]}"]`).click();
        await page.locator('#progSub .prog-check').click();
      }
      await answerCorrectly(page);
      await waitForNextExercise(page);
      await page.evaluate(() => { training.index = training.plan.length; goToNextExercise(); });
      assert.ok(await page.locator('.report-score').isVisible(), 'report shown');
      if (q.kind === 'prog') assert.match(await page.locator('#trainingPanel').textContent(), /שמעת .+ וענית/);
      noErrors(errors);
      await close();
    });

    test('step-by-step training: pick a level, answer, see the report', async () => {
      const { page, errors, close } = await openPage(vp, 'music_theory_exercise_tool.html', { mt_app_mode: 'train' });
      const levels = page.locator('#trainingPanel .level-item');
      assert.ok(await levels.count() > 0, 'levels listed');
      await levels.first().click();
      await page.locator('.big-play').click();
      await answerCorrectly(page);
      await waitForNextExercise(page);
      assert.strictEqual(await page.evaluate(() => training.results.length), 1);
      // דילוג עד הסוף מביא לדוח
      await page.evaluate(() => { training.index = training.plan.length; goToNextExercise(); });
      assert.ok(await page.locator('#trainingPanel').isVisible(), 'report shown');
      noErrors(errors);
      await close();
    });

    test('reading step-by-step training: tabs, every level, report by clef', async () => {
      const { page, errors, close } = await openPage(vp, 'music_theory_exercise_tool.html?mode=read', {});
      assert.ok(await page.locator('#modeTabs button[data-mode="read"]').isVisible(), 'read free tab');
      assert.ok(!(await page.locator('#modeTabs button[data-mode="train"]').isVisible()), 'ear tabs hidden in reading');
      await page.locator('#modeTabs button[data-mode="rtrain"]').click();
      const levels = page.locator('#trainingPanel .level-item');
      const n = await levels.count();
      assert.strictEqual(n, 8);
      assert.match(await page.locator('#trainingPanel h2').textContent(), /אימון קריאה/);
      for (let i = 0; i < n; i++) {
        await page.evaluate(lv => startTraining(lv), i);
        // כל תרגיל ברמה מוצג על החמשה ונענה
        for (let k = 0; k < 3; k++) {
          assert.strictEqual(await page.evaluate(() => document.getElementById('displayMode').value), 'both');
          await answerCorrectly(page);
          await waitForNextExercise(page);
        }
        assert.strictEqual(await page.evaluate(() => training.results.length), 3);
        const clefs = await page.evaluate(() => training.results.map(r => r.clef));
        if (i === 0) assert.ok(clefs.every(c => c === 'sol'), 'level 1 is treble clef');
        if (i === 1) assert.ok(clefs.every(c => c === 'fa'), 'level 2 is bass clef');
        await page.evaluate(() => { training.index = training.plan.length; goToNextExercise(); });
        assert.ok(await page.locator('#trainingPanel .report-score').isVisible(), 'report shown');
      }
      const hist = await page.evaluate(() => JSON.parse(localStorage.getItem('mt_read_training_history')));
      assert.strictEqual(hist.length, 8);
      assert.strictEqual(await page.evaluate(() => localStorage.getItem('mt_training_history')), null, 'ear history untouched');
      assert.ok(await page.evaluate(() => Rewards._load().passed.includes('read:0')));
      // לוח השלבים מראה את השיא
      await page.locator('#trainingPanel button', { hasText: 'כל הרמות' }).click();
      assert.match(await levels.first().textContent(), /שיא 100%/);
      noErrors(errors);
      await close();
    });

    test('settings, share link and rewards collection open without errors', async () => {
      const { page, errors, close } = await openPage(vp, 'music_theory_exercise_tool.html', { mt_app_mode: 'read' });
      await page.locator('#exTypeRow button[data-type="chords"]').click();
      await page.locator('#settingsCollapse summary').click();
      assert.ok(await page.evaluate(() => document.getElementById('settingsCollapse').open));
      await page.locator('#settingsCollapse summary').click();
      await page.locator('.share-btn').click();
      const link = await page.evaluate(() => location.origin + location.pathname + '?' + buildShareParams());
      await page.locator('#shareDialog button', { hasText: 'סגירה' }).click();
      await page.locator('#rewardChip').click();
      assert.ok(await page.locator('#rewardsPanel').isVisible(), 'collection open');
      noErrors(errors);
      await close();

      // התלמיד שפותח את הקישור מקבל את אותו סוג תרגיל
      const student = await openPage(vp, link.replace(base, ''));
      assert.strictEqual(await student.page.evaluate(() => currentExercise.type), 'chords');
      noErrors(student.errors);
      await student.close();
    });
  });
}

// ---------- תרגול מקצב ----------
for (const vp of Object.keys(VIEWPORTS)) {
  describe(`rhythm practice (${vp})`, () => {
    test('dictation: play and pick the right bar', async () => {
      const { page, errors, close } = await openPage(vp, 'rhythm_practice.html?answer=choose');
      await page.locator('#kindRow button[data-kind="dictation"]').click();
      await page.locator('#bigPlay').click();
      const i = await page.evaluate(() => cur.d.correct);
      await page.locator(`#tiles .tile[data-i="${i}"]`).click();
      assert.ok(await page.locator('#tiles .tile.correct').count() === 1, 'marked correct');
      noErrors(errors);
      await close();
    });

    // לוחצים על התאים של התשובה, פעמה אחר פעמה (עם קשת כשצריך)
    async function writeAnswer(page, upto) {
      const plan = await page.evaluate(() => {
        const out = [];
        cur.d.answer.bars.forEach(bar => bar.forEach(c => out.push({ i: cur.cells.findIndex(x => x.str === c.str), tie: !!c.events[0].tied })));
        return out;
      });
      for (const step of plan.slice(0, upto)) {
        assert.ok(step.i >= 0, 'cell in the pad');
        if (step.tie) await page.locator('#tieBtn').click();
        await page.locator(`#cellPad .cell-btn[data-i="${step.i}"]`).click();
      }
      return plan.length;
    }

    test('dictation by writing: write the beats, check, right', async () => {
      const { page, errors, close } = await openPage(vp, 'rhythm_practice.html?ex=dictation&level=3');
      assert.ok(await page.locator('#cellPad .cell-btn').count() >= 4, 'cells to pick');
      assert.strictEqual(await page.locator('#writeScore svg rect[stroke-dasharray]').count() > 0, true, 'empty beats shown');
      await writeAnswer(page);
      await page.locator('#actions button', { hasText: 'בדיקה' }).click();
      assert.strictEqual(await page.locator('#prompt').textContent(), 'נכון');
      assert.match(await page.locator('#score').textContent(), /^1 מתוך 1/);
      noErrors(errors);
      await close();
    });

    test('dictation by writing: a wrong beat is marked and can be fixed', async () => {
      const { page, errors, close } = await openPage(vp, 'rhythm_practice.html?ex=dictation&level=2&parts=q,8');
      // כותבים הכל הפסקות רבע: לפחות פעמה אחת לא נכונה
      const rest = await page.evaluate(() => cur.cells.findIndex(c => c.str === 'Rq'));
      const beats = await page.evaluate(() => cur.d.answer.bars.length * R.METERS[cur.d.answer.meter].beats);
      for (let k = 0; k < beats; k++) await page.locator(`#cellPad .cell-btn[data-i="${rest}"]`).click();
      await page.locator('#actions button', { hasText: 'בדיקה' }).click();
      assert.match(await page.locator('#prompt').textContent(), /לא נכונ/);
      assert.ok(await page.locator('#writeScore svg rect[fill="#ececec"]').count() >= 1, 'wrong beat shaded');
      assert.strictEqual(await page.locator('#score').textContent(), '0 מתוך 1');
      await page.locator('#actions button', { hasText: 'תיקון' }).click();
      assert.ok(await page.evaluate(() => cur.entries.length) < beats, 'entries removed from the wrong beat');
      noErrors(errors);
      await close();
    });

    test('dictation by writing: help writes the next beat, then shows the answer', async () => {
      const { page, errors, close } = await openPage(vp, 'rhythm_practice.html?ex=dictation&level=1');
      await page.locator('#actions button', { hasText: 'עזרה' }).click();
      await page.locator('#actions button', { hasText: 'רמז נוסף' }).click();
      assert.strictEqual(await page.evaluate(() => cur.entries.length), 1, 'one beat written');
      await page.locator('#actions button', { hasText: 'תשובה' }).click();
      assert.ok(await page.locator('.cmp-label', { hasText: 'מה שהושמע' }).isVisible());
      assert.strictEqual(await page.locator('#score').textContent(), '0 מתוך 1');
      noErrors(errors);
      await close();
    });

    test('dictation by writing: ties from the previous beat', async () => {
      const { page, errors, close } = await openPage(vp, 'rhythm_practice.html?ex=dictation&level=3&parts=q,8,tie');
      for (let k = 0; k < 20; k++) {
        if (await page.evaluate(() => R.flatten(cur.d.answer).some(e => e.tie))) break;
        await page.evaluate(() => newExercise(false));
      }
      await writeAnswer(page);
      await page.locator('#actions button', { hasText: 'בדיקה' }).click();
      assert.strictEqual(await page.locator('#prompt').textContent(), 'נכון');
      noErrors(errors);
      await close();
    });

    test('complete the bar: pick the missing symbol', async () => {
      const { page, errors, close } = await openPage(vp, 'rhythm_practice.html');
      await page.locator('#kindRow button[data-kind="complete"]').click();
      const i = await page.evaluate(() => cur.c.correct);
      await page.locator(`#tiles .tile[data-i="${i}"]`).click();
      assert.ok(await page.locator('#tiles .tile.correct').count() === 1, 'marked correct');
      noErrors(errors);
      await close();
    });

    test('dictation: a right answer moves on by itself', async () => {
      const { page, errors, close } = await openPage(vp, 'rhythm_practice.html?answer=choose');
      await page.locator('#kindRow button[data-kind="dictation"]').click();
      await page.evaluate(() => { window.__firstEx = cur.d; });
      const i = await page.evaluate(() => cur.d.correct);
      await page.locator(`#tiles .tile[data-i="${i}"]`).click();
      // התשובה הראשונה פותחת שיר באוסף: סוגרים אותו, והתרגול ממשיך לבד
      await page.locator('#rewardDialog').waitFor({ state: 'visible', timeout: 3000 });
      await page.evaluate(() => Rewards.closeUnlock());
      await page.waitForFunction(() => cur.d !== window.__firstEx, null, { timeout: 4000 });
      assert.strictEqual(await page.locator('#score').textContent(), '1 מתוך 1');
      noErrors(errors);
      await close();
    });

    test('dictation: stepped help, then the answer, not counted as right', async () => {
      const { page, errors, close } = await openPage(vp, 'rhythm_practice.html?answer=choose');
      await page.locator('#kindRow button[data-kind="dictation"]').click();
      await page.locator('#actions button', { hasText: 'עזרה' }).click();
      await page.locator('#actions button', { hasText: 'רמז נוסף' }).click();
      assert.strictEqual(await page.locator('#tiles .tile.hint-out').count(), 2, 'two options left');
      await page.locator('#actions button', { hasText: 'תשובה' }).click();
      assert.strictEqual(await page.locator('#tiles .tile.correct').count(), 1);
      assert.strictEqual(await page.locator('#score').textContent(), '0 מתוך 1');
      noErrors(errors);
      await close();
    });

    test('complete the bar: help shows beat numbers and what is missing', async () => {
      const { page, errors, close } = await openPage(vp, 'rhythm_practice.html');
      await page.locator('#kindRow button[data-kind="complete"]').click();
      await page.locator('#actions button', { hasText: 'עזרה' }).click();
      assert.ok(await page.locator('#bar svg text', { hasText: '1' }).count() >= 1, 'beat numbers');
      await page.locator('#actions button', { hasText: 'רמז נוסף' }).click();
      assert.match(await page.locator('#prompt').textContent(), /חסר/);
      noErrors(errors);
      await close();
    });

    test('read and tap: help adds counting under the notes', async () => {
      const { page, errors, close } = await openPage(vp, 'rhythm_practice.html');
      await page.locator('#kindRow button[data-kind="tap"]').click();
      await page.locator('#actions button', { hasText: 'עזרה' }).click();
      assert.ok(await page.locator('.score-view svg text').count() >= 2, 'counting shown');
      await page.locator('#actions button', { hasText: 'ניסיון איטי' }).click();
      assert.equal(await page.locator('#actions button', { hasText: 'ניסיון איטי' }).count(), 0, 'last help step used');
      await page.locator('#tapPad').click();
      await page.evaluate(() => finishTap());
      assert.ok(await page.locator('.summary').isVisible());
      noErrors(errors);
      await close();
    });

    test('no duplicate play buttons: dictation plays only from the big button', async () => {
      const { page, errors, close } = await openPage(vp, 'rhythm_practice.html?ex=dictation');
      for (const answer of ['choose', 'write']) {
        await page.goto(page.url().split('?')[0] + '?ex=dictation&answer=' + answer);
        await page.locator('#bigPlay').waitFor();
        assert.equal(await page.locator('#actions button', { hasText: 'השמע' }).count(), 0, answer);
      }
      noErrors(errors);
      await close();
    });

    test('syllables switch shows konnakol under the notes in every exercise', async () => {
      const { page, errors, close } = await openPage(vp, 'rhythm_practice.html?answer=choose');
      await page.locator('#settingsBox summary').click();
      await page.locator('#sylSeg button', { hasText: 'להציג' }).first().click();
      assert.ok(await page.locator('#tiles svg text', { hasText: 'ta' }).count() >= 4, 'dictation options');
      await page.locator('#kindRow button[data-kind="complete"]').click();
      assert.ok(await page.locator('#bar svg text', { hasText: 'ta' }).count() >= 1, 'complete the bar');
      await page.locator('#kindRow button[data-kind="tap"]').click();
      assert.ok(await page.locator('.score-view svg text', { hasText: 'ta' }).count() >= 1, 'read and tap');
      noErrors(errors);
      await close();
    });

    test('levels and components: level sets its tempo, components toggle, one basic value stays', async () => {
      const { page, errors, close } = await openPage(vp, 'rhythm_practice.html');
      await page.locator('#settingsBox summary').click();
      await page.locator('#levelSeg button[data-v="4"]').click();
      assert.ok((await page.locator('#tempoSeg button.active').textContent()).includes('90'));
      await page.locator('#partsSeg button[data-v="8"]').click();
      await page.locator('#partsSeg button[data-v="tie"]').click();
      assert.match(await page.locator('#levelLine').textContent(), /שמיניות, קשתות/);
      // מורידים חצאים ורבעים: השמיניות נשארות, ואי אפשר להוריד את הערך הרגיל האחרון
      await page.locator('#partsSeg button[data-v="h"]').click();
      await page.locator('#partsSeg button[data-v="q"]').click();
      await page.locator('#partsSeg button[data-v="8"]').click();
      assert.strictEqual(await page.locator('#partsSeg button.active').count(), 2);
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mt_rhythm_settings')).parts);
      assert.deepStrictEqual(saved, ['8', 'tie']);
      noErrors(errors);
      await close();
    });

    test('rhythm step-by-step training: pick a step, 12 mixed exercises, report, free settings kept', async () => {
      const { page, errors, close } = await openPage(vp, 'rhythm_practice.html?answer=choose');
      await page.locator('#modeTabs button[data-mode="train"]').click();
      const steps = page.locator('#trainingPanel .level-item');
      assert.strictEqual(await steps.count(), 12);
      await steps.nth(1).click();
      assert.match(await page.locator('#score').textContent(), /1 מתוך 12/);
      assert.match(await page.locator('#levelLine').textContent(), /שלב 2/);
      for (let i = 0; i < 12; i++) {
        // הכתבה: עונים נכון; השאר: מדלגים (נספר כטעות)
        const isDict = await page.evaluate(() => cur.kind === 'dictation');
        if (isDict) await page.locator(`#tiles .tile[data-i="${await page.evaluate(() => cur.d.correct)}"]`).click();
        await page.evaluate(() => trainingNext(false));
      }
      assert.ok(await page.locator('.report-score').isVisible(), 'report shown');
      assert.match(await page.locator('#trainingPanel').textContent(), /לפי סוג תרגיל[\s\S]*לפי מרכיב/);
      assert.match(await page.locator('#trainingPanel').textContent(), /42%/);
      assert.deepStrictEqual(await page.evaluate(() => [state.level, state.parts.join(), state.tempo]), [1, 'h,q', 60], 'free settings back');
      const hist = await page.evaluate(() => JSON.parse(localStorage.getItem('mt_rhythm_training_history')));
      assert.strictEqual(hist.length, 1);
      await page.locator('#modeTabs button[data-mode="free"]').click();
      assert.ok(await page.locator('#kindRow').isVisible());
      noErrors(errors);
      await close();
    });

    test('read and tap: start, tap, get a summary', async () => {
      const { page, errors, close } = await openPage(vp, 'rhythm_practice.html');
      await page.locator('#kindRow button[data-kind="tap"]').click();
      await page.locator('#tapPad').click();
      await page.locator('#tapPad').click();
      await page.evaluate(() => finishTap());
      assert.ok(await page.locator('.summary').isVisible(), 'summary shown');
      noErrors(errors);
      await close();
    });
  });
}

// ---------- "על מה לוחצים?" ----------
for (const vp of Object.keys(VIEWPORTS)) {
  describe(`what to tap panel (${vp})`, () => {
    test('every page: opens, shows more, closes, and stays quiet after the first look', async () => {
      const pages = [['music_theory_exercise_tool.html?mode=read', 'read:intervals'], ['music_theory_exercise_tool.html?mode=ear', 'ear:intervals'],
        ['rhythm_practice.html', 'rhythm:write'], ['music_theory_worksheets_generator.html', 'print']];
      for (const [file, key] of pages) {
        const { page, errors, close } = await openPage(vp, file);
        const link = page.locator('.hp-link');
        await link.waitFor();
        assert.ok(await link.evaluate(el => el.classList.contains('fresh')), file + ': dark before the first look');
        await link.click();
        const card = page.locator('.hp-card');
        assert.ok(await card.isVisible(), file + ': card opens');
        const short = await page.evaluate(k => HelpPanel.TOPICS[k].short, key);
        assert.strictEqual(await card.locator('.hp-short').textContent(), short, file + ': text for this screen');
        await card.locator('.hp-more').click();
        assert.ok(await card.locator('.hp-sec').count() > 0, file + ': more details');
        await card.locator('.hp-close').click();
        assert.ok(await card.isHidden(), file + ': closes');
        assert.ok(!(await link.evaluate(el => el.classList.contains('fresh'))), file + ': grey after the first look');
        noErrors(errors);
        await close();
      }
    });

    test('practice: the text follows the exercise type and the training screen', async () => {
      const { page, errors, close } = await openPage(vp, 'music_theory_exercise_tool.html?mode=read');
      await page.locator('#exTypeRow button[data-type="chords"]').click();
      await page.locator('.hp-link').click();
      assert.strictEqual(await page.locator('.hp-short').textContent(), await page.evaluate(() => HelpPanel.TOPICS['read:chords'].short));
      await page.keyboard.press('Escape');
      assert.ok(await page.locator('.hp-card').isHidden());
      await page.evaluate(() => setAppMode('train'));
      await page.locator('.hp-link').click();
      assert.strictEqual(await page.locator('.hp-short').textContent(), await page.evaluate(() => HelpPanel.TOPICS['ear:train'].short));
      await page.keyboard.press('Escape');
      await page.evaluate(() => setAppMode('rtrain'));
      assert.ok(await page.locator('.hp-link').isVisible(), 'shown in reading training');
      await page.locator('.hp-link').click();
      assert.strictEqual(await page.locator('.hp-short').textContent(), await page.evaluate(() => HelpPanel.TOPICS['read:train'].short));
      noErrors(errors);
      await close();
    });
  });
}

// ---------- בלי אינטרנט ----------
describe('offline', () => {
  test('every file the service worker saves ahead exists', () => {
    const src = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    const list = JSON.parse(src.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1].replace(/\/\/.*$/gm, '').replace(/'/g, '"').replace(/,\s*\]/, ']'));
    for (const f of list) if (f !== './') assert.ok(fs.existsSync(path.join(ROOT, f)), 'missing ' + f);
    // וכל דף וקובץ JS באתר נמצא ברשימה
    const pages = fs.readdirSync(ROOT).filter(f => /\.html$/.test(f));
    const scripts = fs.readdirSync(path.join(ROOT, 'practice')).map(f => 'practice/' + f);
    for (const f of [...pages, ...scripts]) assert.ok(list.includes(f), f + ' is not saved for offline use');
  });

  test('after one visit, every page opens and works with no network', async () => {
    const { page, context, errors, close } = await openPage('mobile', 'index.html', { mt_app_mode: 'read' }, { serviceWorkers: 'allow' });
    await page.evaluate(() => Promise.race([navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error('no service worker registered')), 10000))]));
    // מחכים שההתקנה תשמור את כל הקבצים, וגם את הכבדים שנשמרים כשהדף רגוע
    const saved = () => page.evaluate(async () => {
      const keys = (await (await caches.open('site-v1')).keys()).map(r => r.url);
      return keys.length >= 45 && keys.some(u => u.endsWith('sounds/harp/D6.mp3')) && keys.some(u => u.endsWith('html2canvas.min.js'));
    });
    for (const t0 = Date.now(); !(await saved());) {
      assert.ok(Date.now() - t0 < 30000, 'files saved for offline use');
      await page.waitForTimeout(250);
    }
    await context.setOffline(true);

    for (const f of ['index.html', 'rhythm_practice.html', 'music_theory_worksheets_generator.html', 'music_theory_algorythm.html']) {
      await page.goto(base + f);
      assert.ok(await page.locator('body').isVisible(), f);
    }
    await page.goto(base + 'music_theory_exercise_tool.html');
    assert.ok(await page.evaluate(() => document.fonts.check('16px Assistant')), 'font available offline');
    await page.locator('#exTypeRow button[data-type="intervals"]').click();
    await page.locator('#playAudioBtn').click();
    assert.ok(await page.evaluate(() => Object.keys(sampleBuffers).length > 0 || sampleLoads.harp), 'harp samples load offline');
    await page.evaluate(() => sampleLoads.harp);
    assert.ok(await page.evaluate(() => !!sampleBuffers.harp), 'harp samples decoded offline');
    await answerCorrectly(page);
    await waitForNextExercise(page);
    // ספריות ה-PDF נטענו גם הן מהעותק השמור
    await page.goto(base + 'music_theory_worksheets_generator.html');
    await page.evaluate(() => loadPdfLibs());
    assert.ok(await page.evaluate(() => !!(window.jspdf && window.html2canvas)), 'PDF libraries offline');
    noErrors(errors.filter(e => !/version\.json/.test(e)));
    await close();
  });

  test('on a very weak network, a visited page opens quickly from the saved copy', async () => {
    const { page, context, errors, close } = await openPage('mobile', 'music_theory_exercise_tool.html', {}, { serviceWorkers: 'allow' });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.evaluate(() => sampleLoads.harp);
    serverDelayMs = 20000;
    try {
      const t0 = Date.now();
      await page.goto(base + 'music_theory_exercise_tool.html', { timeout: 15000 });
      await page.waitForFunction(() => typeof sampleBuffers !== 'undefined' && !!sampleBuffers.harp, null, { timeout: 15000 });
      const ms = Date.now() - t0;
      assert.ok(ms < 7000, 'page and sounds ready in ' + ms + 'ms');
    } finally {
      serverDelayMs = 0;
    }
    noErrors(errors.filter(e => !/version\.json/.test(e)));
    await close();
  });
});
