// הודעה על גרסה חדשה של האתר.
// version.json מתעדכן בכל פרסום. הדף זוכר את הגרסה שהייתה כשנטען, בודק שוב כשחוזרים אליו
// (חשוב באפליקציה ממסך הבית, שנשארת פתוחה) וכל כמה דקות, ומציג פס לרענון אם הגרסה השתנתה.
(function () {
  const URL = 'version.json';
  const INTERVAL = 5 * 60 * 1000;

  const CSS = `
    .update-bar { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 9px 16px;
      background: #f2f2f2; color: #222222; font-family: 'Assistant', sans-serif; font-size: 15px; direction: rtl; }
    .update-bar button { font: inherit; border: none; background: none; cursor: pointer; padding: 0; }
    .update-bar .update-reload { color: #222222; text-decoration: underline; }
    .update-bar .update-close { color: #999999; }
    @media print { .update-bar { display: none; } }
  `;

  let loaded = null;
  let bar = null;
  let dismissed = null;

  async function fetchVersion() {
    try {
      const res = await fetch(URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return null;
      return (await res.json()).version || null;
    } catch (e) {
      return null;
    }
  }

  function show(version) {
    if (bar || dismissed === version) return;
    if (!document.getElementById('update-bar-css')) {
      const style = document.createElement('style');
      style.id = 'update-bar-css';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    bar = document.createElement('div');
    bar.className = 'update-bar';
    bar.innerHTML = '<span>יש גרסה חדשה</span><button class="update-reload">לרענון</button><button class="update-close">סגירה</button>';
    bar.querySelector('.update-reload').onclick = () => location.reload();
    bar.querySelector('.update-close').onclick = () => { dismissed = version; bar.remove(); bar = null; if (nav) nav.style.marginTop = navTop; };
    // פס ברוחב מלא בראש הדף, מעל סרגל הניווט, גם כשלגוף הדף יש ריפוד
    const bs = getComputedStyle(document.body);
    bar.style.margin = `-${bs.paddingTop} -${bs.paddingLeft} ${bs.paddingTop} -${bs.paddingRight}`;
    const nav = document.querySelector('.site-nav');
    const navTop = nav ? nav.style.marginTop : '';
    if (nav) { nav.style.marginTop = '0'; bar.style.marginBottom = '0'; }
    document.body.prepend(bar);
  }

  async function check() {
    const v = await fetchVersion();
    if (!v) return;
    if (!loaded) loaded = v;
    else if (v !== loaded) show(v);
  }

  check();
  setInterval(() => { if (!document.hidden) check(); }, INTERVAL);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  window.addEventListener('focus', check);
})();
