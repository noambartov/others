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

before(async () => {
  server = http.createServer((req, res) => {
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

// דף חדש עם רישום שגיאות. בקשות לאתרים חיצוניים (גופנים, ספריות PDF) נחסמות כדי שהבדיקה לא תלויה ברשת.
async function openPage(viewport, file, storage = {}) {
  const { defaultBrowserType, ...opts } = VIEWPORTS[viewport];
  const context = await browser.newContext({ ...opts, locale: 'he-IL' });
  await context.route(url => !url.href.startsWith(base), route => route.abort());
  await context.addInitScript(items => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
  }, storage);
  context.setDefaultTimeout(8000);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => { errors.push('unexpected dialog: ' + d.message()); d.dismiss(); });
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // משאבים חיצוניים חסומים בכוונה
    if (/ERR_FAILED|ERR_BLOCKED|Failed to load resource/.test(t)) return;
    errors.push('console: ' + t);
  });
  await page.goto(base + file);
  return { page, errors, close: () => context.close() };
}

function noErrors(errors) {
  assert.deepStrictEqual(errors, [], 'errors in page:\n' + errors.join('\n'));
}

// ---------- דפי האתר נטענים ----------
for (const vp of Object.keys(VIEWPORTS)) {
  describe(`pages load (${vp})`, () => {
    test('home page links to every section', async () => {
      const { page, errors, close } = await openPage(vp, 'index.html');
      for (const href of ['music_theory_exercise_tool.html', 'music_theory_worksheets_generator.html']) {
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

  if (ex.type === 'note_id') {
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
const EAR_TYPES = ['intervals', 'chords', 'septachords', 'scales', 'modes'];

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
