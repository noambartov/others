// חלונית "על מה לוחצים?": מסבירה איך משתמשים במסך הנוכחי (תפעול האתר, לא דרך הפתרון).
// משפט אחד בהתחלה, ו"עוד פרטים" פותח את השאר. נפתחת רק בלחיצה על הכותרת. ("עזרה" הוא כפתור אחר: רמזים מוזיקליים לתרגיל.)
// הכותרת כהה עד שפותחים אותה פעם אחת במסך הזה, ואחר כך אפורה ושקטה כמו "הגדרות".
// כל דף קורא ל-HelpPanel.init עם המקום של המילה ועם פונקציה שמחזירה את שם המסך (מפתח ב-TOPICS).
(function () {
  const SEEN_KEY = 'mt_help_seen';

  // ---- הטקסטים ----
  const TOP = ['היום', '"היום" מראה כמה תרגילים עשיתם מתוך היעד היומי. לחיצה עליו פותחת את האוסף: רצף ימים, מיומנויות ושירים שנפתחים בהישגים.'];
  const READ_ANSWER = ['עונים', 'תשובה נכונה נצבעת בשחור, ואחרי רגע מגיע תרגיל חדש. תשובה שגויה נמחקת בקו, ואפשר לנסות שוב.'];
  const READ_BUTTONS = ['כפתורים', '"השמע" משמיע את מה שכתוב. "לתרגיל הבא" מדלג. "שתף" יוצר קישור לתרגיל עם אותן הגדרות, למשל כדי לשלוח לתלמידים. "עזרה" נותן רמז, ובלחיצות נוספות עוד רמז ואז את התשובה.'];
  const READ_SETTINGS = ['הגדרות', 'ב"הגדרות" בוחרים מה לתרגל, מפתח ועוד. השינוי חל כשסוגרים את ההגדרות.'];
  const EAR_LISTEN = ['שומעים', 'אפשר לשמוע שוב כמה פעמים שרוצים. אחרי תשובה נכונה התרגיל הבא מתנגן לבד.'];
  const EAR_ANSWER = ['עונים', 'תשובה שגויה נמחקת בקו, ו"לשמוע מה שבחרתי" משמיע אותה כדי להשוות. אפשר לנסות שוב עד שמצליחים.'];
  const EAR_BUTTONS = ['כפתורים', '"לתרגיל הבא" מדלג. "שתף" יוצר קישור לתרגיל עם אותן הגדרות. "עזרה" נותן רמז, ובלחיצות נוספות עוד רמז ואז את התשובה.'];
  const EAR_SETTINGS = ['הגדרות', 'ב"הגדרות" בוחרים מה לתרגל, כלי נגינה ואופן הנגינה. השינוי חל כשסוגרים את ההגדרות. "לפי שלבים" הוא אימון מסודר מהקל לקשה.'];
  const read = s => ({ short: s, more: [READ_ANSWER, READ_BUTTONS, READ_SETTINGS, TOP] });
  const ear = s => ({ short: s, more: [EAR_LISTEN, EAR_ANSWER, EAR_BUTTONS, EAR_SETTINGS, TOP] });

  const TRAIN_COUNT = ['מה נספר', 'רק הניסיון הראשון בכל תרגיל נחשב. שימוש ב"עזרה" או דילוג נספרים כטעות.'];
  const RH_LEVEL = ['שלב', 'השורה שמתחת לסוגי התרגול מראה את השלב, המשקלים והמהירות. לחיצה עליה פותחת את ההגדרות.'];
  const RH_SETTINGS = ['הגדרות', 'ב"הגדרות" בוחרים שלב, מרכיבים, מהירות, הברות ספירה מתחת לתווים ומטרונום.'];

  const TOPICS = {
    'read:note_id': {
      short: 'בוחרים את שם התו שעל החמשה, ואם צריך גם במול או דיאז.',
      more: [['עונים', 'אפשר ללחוץ על במול או דיאז לפני השם או אחריו. תשובה נכונה נצבעת בשחור, ואחרי רגע מגיע תרגיל חדש. תשובה שגויה נמחקת בקו, ואפשר לנסות שוב.'],
        READ_BUTTONS, ['הגדרות', 'ב"הגדרות" בוחרים מפתח וכמה סימני היתק יופיעו. השינוי חל כשסוגרים את ההגדרות.'], TOP]
    },
    'read:intervals': read('בוחרים בכפתורים שלמטה את שם המרווח שעל החמשה.'),
    'read:chords': read('בוחרים קודם את סוג האקורד ואחר כך את ההיפוך שלו.'),
    'read:septachords': read('בוחרים קודם את סוג הספטאקורד ואחר כך את ההיפוך שלו.'),
    'read:scales': read('בוחרים את הצליל שהסולם מתחיל ממנו ואת סוג הסולם.'),
    'read:modes': read('בוחרים את הצליל שהמודוס מתחיל ממנו ואת שם המודוס.'),
    'ear:intervals': ear('לוחצים על הכפתור הגדול כדי לשמוע, ובוחרים את המרווח.'),
    'ear:chords': ear('לוחצים על הכפתור הגדול כדי לשמוע, ובוחרים את סוג האקורד ואת ההיפוך.'),
    'ear:septachords': ear('לוחצים על הכפתור הגדול כדי לשמוע, ובוחרים את סוג הספטאקורד ואת ההיפוך.'),
    'ear:scales': ear('לוחצים על הכפתור הגדול כדי לשמוע, ובוחרים את סוג הסולם.'),
    'ear:modes': ear('לוחצים על הכפתור הגדול כדי לשמוע, ובוחרים את שם המודוס.'),
    'ear:train': {
      short: 'בוחרים שלב, ומתחיל אימון של 20 תרגילים.',
      more: [['שלבים', 'השלבים מסודרים מהקל לקשה. ליד שלב שכבר תרגלתם מופיע השיא שלכם.'], TRAIN_COUNT,
        ['בסוף', 'מקבלים דוח: מה הולך טוב, מה צריך חיזוק ואילו תשובות התבלבלו זו בזו. מ-85% ומעלה מוצע לעבור לשלב הבא.'],
        ['חופשי', '"חופשי" חוזר לתרגול רגיל, בלי ספירה ובלי דוח.']]
    },
    'ear:session': {
      short: 'עונים על 20 תרגילים, ורק הניסיון הראשון נחשב.',
      more: [TRAIN_COUNT, ['כפתורים', '"דוח עד כה" מראה איך הולך עד עכשיו. "סיום אימון" עוצר ומראה את הדוח.'], EAR_LISTEN]
    },
    'daily': {
      short: 'התרגול היומי: 20 תרגילים מהמיומנויות שבחרתם באוסף.',
      more: [['מה יש בו', 'התרגילים מעורבבים, ויש יותר ממה שעוד חלש לכם.'], TRAIN_COUNT,
        ['בסוף', 'מקבלים דוח, והתרגילים נספרים ליעד היומי.']]
    },
    'rewards': {
      short: 'כאן רואים את ההתקדמות שלכם ואת השירים שנפתחו.',
      more: [['למעלה', 'רצף ימים, כמה תרגלתם היום מתוך היעד, השיא ומספר התרגילים בסך הכול.'],
        ['מיומנויות', 'לוחצים על מיומנות כדי לבחור אותה. "תרגול יומי" נבנה מהמיומנויות שבחרתם.'],
        ['השבוע', 'מה תרגלתם בכל יום. שם גם משנים את היעד היומי.'],
        ['שירים', 'כל הישג פותח שיר קצר. לוחצים על שיר כדי לשמוע אותו.'],
        ['חזרה', '"חזרה לתרגול" מחזיר למסך התרגול.']]
    },
    'rhythm:write': {
      short: 'לוחצים על הכפתור הגדול כדי לשמוע, וכותבים את הקצב פעמה אחרי פעמה.',
      more: [['שומעים', 'קודם נשמעת תיבת ספירה אחת, ואחריה הקצב. אפשר לשמוע שוב כמה פעמים שרוצים.'],
        ['כותבים', 'לכל פעמה בוחרים מהכפתורים את מה שנשמע בה. "קשת מהפעמה הקודמת" מחבר את הצליל הבא לקודם. "מחיקה" מוחק את האחרון.'],
        ['בודקים', 'כשהתיבות מלאות לוחצים "בדיקה". אם יש טעות, "תיקון" ממשיך לכתוב מהפעמה המסומנת.'],
        ['כפתורים', '"עזרה" נותן רמז, ובלחיצות נוספות עוד רמז ואז את התשובה. "לתרגיל הבא" מדלג.'],
        RH_LEVEL, ['הגדרות', 'ב"הגדרות" אפשר לעבור ל"בחירה מארבע", ולבחור שלב, מרכיבים, מהירות ומטרונום.']]
    },
    'rhythm:choose': {
      short: 'לוחצים על הכפתור הגדול כדי לשמוע, ובוחרים את הקצב מבין ארבע אפשרויות.',
      more: [['שומעים', 'קודם נשמעת תיבת ספירה אחת, ואחריה הקצב. אפשר לשמוע שוב כמה פעמים שרוצים.'],
        ['כפתורים', '"עזרה" נותן רמז. "לתרגיל הבא" מדלג.'],
        RH_LEVEL, ['הגדרות', 'ב"הגדרות" אפשר לעבור ל"כתיבת התווים", ולבחור שלב, מרכיבים, מהירות ומטרונום.']]
    },
    'rhythm:tap': {
      short: 'לוחצים על המשטח כדי להתחיל, ומקישים את הקצב שכתוב עם המטרונום.',
      more: [['מקישים', 'אחרי תיבת ספירה אחת מקישים על המשטח בכל תו. במחשב אפשר גם להקיש על מקש הרווח.'],
        ['תוצאה', 'בסוף רואים מתחת לכל תו אם הקדמתם או איחרתם. כשהכול בזמן, התרגיל הבא מגיע לבד.'],
        ['כפתורים', '"עזרה" נותן רמז, למשל ניסיון איטי שבו הקצב מתנגן יחד איתכם.'],
        RH_LEVEL, RH_SETTINGS]
    },
    'rhythm:complete': {
      short: 'בוחרים את הסימן שחסר כדי להשלים את התיבה.',
      more: [['עונים', 'תשובה נכונה משלימה את התיבה, ו"השמע" משמיע אותה. תשובה שגויה נמחקת, ואפשר לנסות שוב.'],
        ['כפתורים', '"עזרה" נותן רמז. "לתרגיל הבא" מדלג.'],
        RH_LEVEL, RH_SETTINGS]
    },
    'rhythm:train': {
      short: 'בוחרים שלב, ומתחיל אימון קצב קצר.',
      more: [['שלבים', 'השלבים מסודרים מהקל לקשה ומשלבים הכתבה, הקשה והשלמה. ליד שלב שכבר תרגלתם מופיע השיא שלכם.'],
        TRAIN_COUNT, ['בסוף', 'מקבלים דוח, ואם עברתם מוצע לעבור לשלב הבא.'],
        ['חופשי', '"חופשי" חוזר לתרגול רגיל, בלי ספירה ובלי דוח.']]
    },
    'rhythm:session': {
      short: 'עונים על תרגילי השלב, ורק הניסיון הראשון נחשב.',
      more: [TRAIN_COUNT, ['סיום', '"סיום אימון" עוצר ומראה את הדוח.']]
    },
    'print': {
      short: 'מוסיפים חמשות, בוחרים תרגיל לכל אחת, ומורידים PDF להדפסה.',
      more: [['חמשות', 'כל שורה היא חמשה בדף. לחיצה על שורה פותחת אותה לעריכה: מה לתרגל, מפתח, צליל נתון ואילו פריטים. "+ הוספת חמשה" מוסיף שורה.'],
        ['כפתורים', '"צור תרגילים" מגריל תרגילים חדשים לפי הבחירה. "דף תשובות" מציג את הפתרונות. "הורדת PDF" שומר את הדף להדפסה.'],
        ['טיפ', 'אפשר להגריל שוב כמה פעמים שרוצים עד שהדף נראה טוב.']]
    }
  };

  const CSS = `
    .hp-link { background: none; border: none; padding: 0; font: inherit; font-family: 'Assistant', sans-serif; font-size: 15px; font-weight: 500;
      color: #999999; cursor: pointer; transition: color .15s; white-space: nowrap; }
    .hp-link:hover, .hp-link.fresh, .hp-link[aria-expanded="true"] { color: #222222; }
    .topbar > .hp-link { position: absolute; top: 10px; }
    .site-nav { position: relative; }
    .site-nav > .hp-link { position: absolute; left: 16px; top: 12px; font-size: 14px; font-weight: 400; }
    .app-header > .hp-link { margin-top: 12px; font-size: 14px; font-weight: 400; }
    .hp-card { position: absolute; z-index: 60; width: 320px; box-sizing: border-box; padding: 16px 18px 14px;
      background: #ffffff; border: 1px solid #e5e5e5; border-radius: 14px; box-shadow: 0 6px 24px rgba(0,0,0,.07);
      font-family: 'Assistant', sans-serif; direction: rtl; text-align: right; color: #333333; }
    .hp-card[hidden] { display: none; }
    .hp-card .hp-short { margin: 0; font-size: 15px; line-height: 1.55; color: #333333; }
    .hp-card .hp-sec { margin: 9px 0 0; font-size: 14px; line-height: 1.6; color: #555555; }
    .hp-card .hp-sec b { font-weight: 600; color: #222222; margin-left: 6px; }
    .hp-card .hp-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
    .hp-card .hp-more { background: none; border: none; padding: 0; font: inherit; font-size: 14px; color: #999999; cursor: pointer;
      text-decoration: underline; text-decoration-color: #cccccc; text-underline-offset: 3px; }
    .hp-card .hp-more:hover { color: #222222; }
    .hp-card .hp-close { border: 1px solid #d1d5db; border-radius: 999px; background: #ffffff; padding: 5px 16px; font: inherit;
      font-size: 14px; color: #222222; cursor: pointer; }
    .hp-card .hp-close:hover { background: #f5f5f5; }
    @media (max-width: 560px) {
      .hp-card { position: fixed; left: 12px !important; right: 12px; top: auto !important; width: auto;
        bottom: calc(14px + env(safe-area-inset-bottom)); max-height: 70vh; overflow-y: auto; }
    }
    @media print { .hp-link, .hp-card { display: none !important; } }
  `;

  let link, card, anchorEl, getTopic, openTopic = null, expanded = false;

  function seen() { try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || []; } catch (e) { return []; } }
  function markSeen(key) {
    const s = seen();
    if (s.includes(key)) return;
    s.push(key);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function currentTopic() { try { const k = getTopic(); return TOPICS[k] ? k : null; } catch (e) { return null; } }

  const phone = () => matchMedia('(max-width: 520px)').matches;

  // במחשב הכותרת ליד "הגדרות" (או במקום שהדף בחר), ובטלפון בפינה של סרגל הניווט, כי ליד "הגדרות" אין מקום
  function mount() {
    const nav = document.querySelector('.site-nav');
    const target = phone() && nav ? nav : anchorEl;
    if (link.parentElement !== target) target.appendChild(link);
  }

  function refresh() {
    if (!link) return;
    mount();
    const key = currentTopic();
    link.hidden = !key;
    link.classList.toggle('fresh', !!key && !seen().includes(key));
    if (openTopic && openTopic !== key) close();
    // בסרגל העליון: המילה יושבת משמאל ל"הגדרות"
    if (link.parentElement.classList.contains('topbar')) {
      const sum = link.parentElement.querySelector('summary');
      link.style.right = (sum ? sum.offsetWidth + 22 : 0) + 'px';
    }
  }

  function render() {
    const t = TOPICS[openTopic];
    card.innerHTML = `<p class="hp-short">${t.short}</p>` +
      (expanded ? t.more.map(([h, txt]) => `<p class="hp-sec"><b>${h}</b>${txt}</p>`).join('') : '') +
      `<div class="hp-foot">${t.more.length ? `<button type="button" class="hp-more">${expanded ? 'פחות' : 'עוד פרטים'}</button>` : '<span></span>'}` +
      `<button type="button" class="hp-close">סגירה</button></div>`;
    card.querySelector('.hp-close').onclick = close;
    const more = card.querySelector('.hp-more');
    if (more) more.onclick = () => { expanded = !expanded; render(); };
    place();
  }

  function place() {
    if (matchMedia('(max-width: 560px)').matches) return;
    const r = link.getBoundingClientRect();
    const w = card.offsetWidth;
    const centered = !link.parentElement.classList.contains('topbar');
    let left = centered ? r.left + r.width / 2 - w / 2 : r.right - w;
    left = Math.max(12, Math.min(left, document.documentElement.clientWidth - w - 12));
    card.style.left = (left + scrollX) + 'px';
    card.style.top = (r.bottom + scrollY + 10) + 'px';
  }

  function open() {
    const key = currentTopic();
    if (!key) return;
    openTopic = key;
    expanded = false;
    card.hidden = false;
    link.setAttribute('aria-expanded', 'true');
    markSeen(key);
    link.classList.remove('fresh');
    render();
  }

  function close() {
    if (!card || card.hidden) return;
    card.hidden = true;
    openTopic = null;
    link.setAttribute('aria-expanded', 'false');
  }

  function init({ anchor, topic }) {
    if (!anchor || link) return;
    // סרגל הניווט נבנה ב-DOMContentLoaded, אז מחכים לו
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => init({ anchor, topic })); return; }
    getTopic = topic;
    anchorEl = anchor;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    link = document.createElement('button');
    link.type = 'button';
    link.className = 'hp-link';
    link.textContent = 'על מה לוחצים?';
    link.setAttribute('aria-expanded', 'false');
    link.onclick = e => { e.stopPropagation(); card.hidden ? open() : close(); };
    mount();

    card = document.createElement('div');
    card.className = 'hp-card';
    card.hidden = true;
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'על מה לוחצים?');
    // "עוד פרטים" מצייר את החלונית מחדש, ואז הכפתור שנלחץ כבר לא בתוכה: לא נותנים ללחיצה להגיע לסגירה שבמסמך
    card.addEventListener('click', e => e.stopPropagation());
    document.body.appendChild(card);

    // לחיצה מחוץ לחלונית סוגרת אותה. אחרי כל לחיצה בדף המסך אולי השתנה, אז מעדכנים את המילה
    document.addEventListener('click', e => {
      if (!card.hidden && !card.contains(e.target) && e.target !== link) close();
      setTimeout(refresh, 0);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', () => { refresh(); if (!card.hidden) place(); });
    new MutationObserver(refresh).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    refresh();
  }

  window.HelpPanel = { init, refresh, open, close, TOPICS };
})();
