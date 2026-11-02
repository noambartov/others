// מערכת תגמולים לתרגול לבד: יעד יומי, רצף ימים, ואוסף שירים קטנים שנפתחים על הישגים.
// הכול נשמר במכשיר (localStorage) בלי הרשמה. הקובץ נטען אחרי הסקריפט הראשי של דף התרגול
// ומשתמש בפונקציות ההשמעה שלו (playInstrumentNote, midiToFreq, silenceAll).
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

  // שירים בנחלת הכלל. tempo = שניות לפעמה
  const SONGS = {
    twinkle: { name: 'כוכב קטן', by: 'עממי צרפתי, וריאציות של מוצרט', tempo: 0.42,
      notes: tune('G4 G4 D5 D5 E5 E5 D5:2 C5 C5 B4 B4 A4 A4 G4:2') },
    jacques: { name: 'פרר ז׳אק', by: 'עממי צרפתי', tempo: 0.42,
      notes: tune('G4 A4 B4 G4 G4 A4 B4 G4 B4 C5 D5:2 B4 C5 D5:2') },
    ode: { name: 'אודה לשמחה', by: 'בטהובן, הסימפוניה התשיעית', tempo: 0.4,
      notes: tune('B4 B4 C5 D5 D5 C5 B4 A4 G4 G4 A4 B4 B4:1.5 A4:.5 A4:2') },
    lullaby: { name: 'שיר ערש', by: 'ברהמס', tempo: 0.42,
      notes: tune('E4:.5 E4:.5 G4:2 E4:.5 E4:.5 G4:2 E4:.5 G4:.5 C5:1 B4:1.5 A4:.5 A4:1 G4:2') },
    minuet: { name: 'מינואט בסול מז׳ור', by: 'מהמחברת של אנה מגדלנה באך', tempo: 0.38,
      notes: tune('D5 G4:.5 A4:.5 B4:.5 C5:.5 D5 G4 G4 E5 C5:.5 D5:.5 E5:.5 F#5:.5 G5 G4 G4') },
    largo: { name: 'לארגו', by: 'דבוז׳ק, הסימפוניה מהעולם החדש', tempo: 0.55,
      notes: tune('A4:1.5 C5:.5 C5:2 A4:1.5 G4:.5 F4:2 G4 A4 C5 A4 G4:3') },
    fifth: { name: 'הסימפוניה החמישית', by: 'בטהובן', tempo: 0.4,
      notes: tune('R:.5 G4:.5 G4:.5 G4:.5 Eb4:3 R:.5 F4:.5 F4:.5 F4:.5 D4:3') },
    morning: { name: 'בוקר', by: 'גריג, פר גינט', tempo: 0.42,
      notes: tune('D5:.5 B4:.5 A4:.5 G4:.5 A4:.5 B4:.5 D5:.5 B4:.5 A4:.5 G4:.5 A4:.5 B4:.5 A4:.5 B4:.5 D5:.5 B4:.5 D5:.5 E5:.5 B4:.5 E5:.5 D5:.5 B4:.5 A4:.5 G4:2') },
    elise: { name: 'לאליזה', by: 'בטהובן', tempo: 0.5,
      notes: tune('E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 C4:.5 E4:.5 A4:.5 B4:1.5 E4:.5 G#4:.5 B4:.5 C5:2') },
    canon: { name: 'קנון', by: 'פכלבל', tempo: 0.6,
      notes: tune('E5 D5 C5 B4 A4 G4 A4 B4:2') },
    mountain: { name: 'בהיכל מלך ההרים', by: 'גריג, פר גינט', tempo: 0.46,
      notes: tune('A4:.5 B4:.5 C5:.5 D5:.5 E5:.5 C5:.5 E5 D#5:.5 B4:.5 D#5 D5:.5 Bb4:.5 D5 A4:.5 B4:.5 C5:.5 D5:.5 E5:.5 C5:.5 E5:.5 A5:.5 G5:.5 E5:.5 C5:.5 E5:.5 G5:2') },
    nacht: { name: 'מוזיקת לילה זעירה', by: 'מוצרט', tempo: 0.42,
      notes: tune('G4:1.5 D4:.5 G4:1.5 D4:.5 G4:.5 D4:.5 G4:.5 B4:.5 D5:2 C5:1.5 A4:.5 C5:1.5 A4:.5 C5:.5 A4:.5 F#4:.5 A4:.5 D4:2') }
  };

  // הסדר הוא גם סדר הקושי. כל הישג פותח שיר אחד
  const ACHIEVEMENTS = [
    { id: 'first', song: 'twinkle', how: 'התרגיל הראשון', test: s => s.total >= 1 },
    { id: 'goal1', song: 'jacques', how: 'להשלים יעד יומי', test: s => s.met.length >= 1 },
    { id: 'run10', song: 'ode', how: '10 תשובות נכונות ברצף', test: s => s.bestRun >= 10 },
    { id: 'streak3', song: 'lullaby', how: '3 ימים ברצף', test: s => streak(s) >= 3 },
    { id: 'total100', song: 'minuet', how: '100 תרגילים', test: s => s.total >= 100 },
    { id: 'pass', song: 'largo', how: 'לעבור רמה באימון לפי שלבים', test: s => s.passed.length >= 1 },
    { id: 'run25', song: 'fifth', how: '25 תשובות נכונות ברצף', test: s => s.bestRun >= 25 },
    { id: 'streak7', song: 'morning', how: '7 ימים ברצף', test: s => streak(s) >= 7 },
    { id: 'perfect', song: 'elise', how: '100% באימון לפי שלבים', test: s => s.perfect },
    { id: 'total500', song: 'canon', how: '500 תרגילים', test: s => s.total >= 500 },
    { id: 'pass4', song: 'mountain', how: 'לעבור את רמה 4', test: s => s.passed.includes(3) },
    { id: 'pass7', song: 'nacht', how: 'לעבור את רמה 7', test: s => s.passed.includes(6) }
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
    return Object.assign({ goal: 20, days: {}, met: [], run: 0, bestRun: 0, total: 0, passed: [], perfect: false, unlocked: {} }, s || {});
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

  // ---------- חמשה קטנה עם המנגינה ----------
  function melodySvg(song, opts = {}) {
    const T = window.TheoryCore.svg;
    const space = 7, top = 22, bottomY = top + 4 * space;
    const staff = { bottomY, space };
    const notes = song.notes;
    const startX = 34;
    // בכרטיסים כל החמשות באותו רוחב, והמרווח בין התווים מתכווץ לפי אורך המנגינה
    const units = notes.reduce((u, n) => u + (n.rest ? 0.6 : 1) + (n.acc ? 0.6 : 0), 0);
    const step = opts.fit ? Math.min(18, (opts.fit - startX - 10) / units) : 15;
    let x = startX, body = '';
    notes.forEach((n, i) => {
      if (n.rest) { x += step * 0.6; return; }
      const y = T.lineY(staff, n.absLine);
      const fill = opts.locked ? '#d6d6d6' : '#222222';
      let accW = 0;
      if (n.acc) {
        accW = T.accidentalWidth(n.acc, space) + 2;
        x += accW;
        body += T.accidental(n.acc, x - T.glyphWidth('noteheadBlack', space) / 2 - 1.5, y, space, fill);
      }
      body += `<g class="mel-note" data-i="${i}">` + T.ledgerLines(x, n.absLine, staff, 7, fill) + T.notehead(x, y, space, fill) + '</g>';
      x += step;
    });
    const w = opts.fit || Math.max(x + 6, 160);
    let lines = '';
    for (let l = 0; l <= 8; l += 2) {
      const y = T.lineY(staff, l);
      lines += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#c8c8c8" stroke-width="0.8"/>`;
    }
    const clef = T.clef('sol', 14, staff, opts.locked ? '#d6d6d6' : '#555555');
    return `<svg class="mel-svg" viewBox="0 0 ${w} ${bottomY + 22}" preserveAspectRatio="xMidYMid meet">${lines}${clef}${opts.locked ? '' : body}</svg>`;
  }

  let playTimers = [];
  function playSong(id, svgHost) {
    const song = SONGS[id];
    playTimers.forEach(clearTimeout);
    playTimers = [];
    silenceAll(0.05);
    const ctx = getAudioContext();
    const t0 = ctx.currentTime + 0.1;
    let t = 0;
    const els = svgHost ? [...svgHost.querySelectorAll('.mel-note')] : [];
    els.forEach(e => e.classList.remove('lit'));
    song.notes.forEach((n, i) => {
      const dur = n.beats * song.tempo;
      if (!n.rest) {
        const last = i === song.notes.length - 1;
        playInstrumentNote(midiToFreq(n.midi), t0 + t, t0 + t + dur * (last ? 3 : 0.95), last ? 0.4 : 0.06);
        const el = svgHost && svgHost.querySelector(`.mel-note[data-i="${i}"]`);
        if (el) playTimers.push(setTimeout(() => {
          els.forEach(e => e.classList.remove('lit'));
          el.classList.add('lit');
        }, (t + 0.1) * 1000));
      }
      t += dur;
    });
    playTimers.push(setTimeout(() => els.forEach(e => e.classList.remove('lit')), (t + 0.6) * 1000));
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
      dlg.className = 'share-dialog';
      document.body.appendChild(dlg);
    }
    dlg.innerHTML = `<div class="share-box reward-box" role="dialog">
      <p class="reward-kicker">שיר חדש באוסף</p>
      <h3>${song.name}</h3>
      <p class="reward-by">${song.by}</p>
      <div class="reward-staff" id="rewardStaff">${melodySvg(song)}</div>
      <p class="reward-how">על: ${a.how}</p>
      ${more}
      <div class="share-actions">
        <button class="primary" onclick="Rewards.closeUnlock()">המשך</button>
        <button onclick="Rewards.play('${a.song}', document.getElementById('rewardStaff'))">נגן שוב</button>
        <button onclick="Rewards.closeUnlock(); Rewards.open()">לאוסף</button>
      </div>
    </div>`;
    dlg.hidden = false;
    setTimeout(() => playSong(a.song, document.getElementById('rewardStaff')), 250);
  }
  function closeUnlock() {
    const dlg = document.getElementById('rewardDialog');
    if (dlg) dlg.hidden = true;
    playTimers.forEach(clearTimeout);
    silenceAll(0.3);
    const fn = afterUnlock;
    afterUnlock = null;
    if (fn) setTimeout(fn, 400);
  }

  // ---------- אירועים מדף התרגול ----------
  // נקרא אחרי כל תרגיל שנפתר. clean = נכון בניסיון הראשון ובלי עזרה.
  // מחזיר את ההישגים החדשים (אם יש) כדי שהדף יחכה עם התרגיל הבא
  function solved(clean) {
    const s = load();
    const today = dayKey();
    s.total++;
    s.days[today] = (s.days[today] || 0) + 1;
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
    } else if (clean && !fresh.length && [5, 15, 20].includes(s.run)) {
      toast(`${s.run} נכונות ברצף`);
    }
    return fresh;
  }

  function broke() {
    const s = load();
    if (!s.run) return;
    s.run = 0;
    save(s);
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
  let returnTo = null;
  function open() {
    const panel = document.getElementById('rewardsPanel');
    const practice = document.getElementById('practiceArea');
    const trainingPanel = document.getElementById('trainingPanel');
    if (panel.style.display !== 'block') {
      returnTo = { practice: practice.style.display, training: trainingPanel.style.display };
    }
    practice.style.display = 'none';
    trainingPanel.style.display = 'none';
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
    if (returnTo) {
      document.getElementById('practiceArea').style.display = returnTo.practice;
      document.getElementById('trainingPanel').style.display = returnTo.training;
    }
    returnTo = null;
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
    const cards = ACHIEVEMENTS.map(a => {
      const song = SONGS[a.song];
      if (!s.unlocked[a.id]) {
        return `<div class="song-card locked">${melodySvg(song, { locked: true, fit: 240 })}
          <div class="song-name">שיר נעול</div><div class="song-how">${a.how}</div></div>`;
      }
      return `<button class="song-card" onclick="Rewards.play('${a.song}', this)">${melodySvg(song, { fit: 240 })}
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
      <div class="report-section">
        <h3>השבוע</h3>
        <div class="wk">${week.join('')}</div>
        <div class="rw-goal"><span>יעד יומי</span><div class="seg">${GOALS.map(g => `<button class="${g === s.goal ? 'active' : ''}" onclick="Rewards.setGoal(${g})">${g}</button>`).join('')}</div></div>
      </div>
      <div class="report-section">
        <h3>שירים ${got} מתוך ${ACHIEVEMENTS.length}</h3>
        <p class="rw-hint">כל הישג פותח שיר קצר. לוחצים על שיר כדי לשמוע אותו.</p>
        <div class="song-grid">${cards}</div>
      </div>`;
  }

  window.Rewards = { solved, broke, trainingDone, renderChip, open, close, setGoal, play: playSong, closeUnlock, showUnlock, SONGS, ACHIEVEMENTS, _load: load, _save: save };
  renderChip();
})();
