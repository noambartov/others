// סרגל הניווט המשותף לכל דפי האתר.
// כל דף טוען את הקובץ הזה, והסרגל נוסף בראש הדף. דף חדש = שורה חדשה ב-SECTIONS.
(function () {
  const SECTIONS = [
    { id: 'ear', label: 'תרגול שמיעה', href: 'music_theory_exercise_tool.html?mode=ear' },
    { id: 'read', label: 'תרגול קריאה', href: 'music_theory_exercise_tool.html?mode=read' },
    { id: 'print', label: 'דפי תרגול להדפסה', href: 'music_theory_worksheets_generator.html' }
  ];

  const CSS = `
    .site-nav { display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 12px 24px; border-bottom: 1px solid #eeeeee; background: #ffffff; direction: rtl;
      font-family: 'Assistant', sans-serif; }
    .site-nav a { text-decoration: none; white-space: nowrap; }
    .site-nav .site-home { font-size: 18px; font-weight: 400; color: #222222; }
    .site-nav .site-links { display: flex; gap: 22px; }
    .site-nav .site-links a { font-size: 15px; color: #999999; transition: color .15s; }
    .site-nav .site-links a:hover, .site-nav .site-links a.active { color: #222222; }
    @media (max-width: 520px) {
      .site-nav { flex-direction: column; gap: 6px; padding: 10px 16px; }
      .site-nav .site-home { font-size: 17px; }
      .site-nav .site-links { gap: 18px; }
    }
    @media print { .site-nav { display: none; } }
  `;

  let nav;

  function setActive(id) {
    if (!nav) return;
    nav.querySelectorAll('.site-links a').forEach(a => a.classList.toggle('active', a.dataset.section === id));
  }

  function build() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    nav = document.createElement('nav');
    nav.className = 'site-nav';
    nav.innerHTML = '<a class="site-home" href="index.html">תורת המוזיקה</a><div class="site-links">' +
      SECTIONS.map(s => `<a href="${s.href}" data-section="${s.id}">${s.label}</a>`).join('') + '</div>';

    // הסרגל ברוחב מלא גם כשלגוף הדף יש ריפוד
    const bs = getComputedStyle(document.body);
    nav.style.margin = `-${bs.paddingTop} -${bs.paddingLeft} ${bs.paddingTop} -${bs.paddingRight}`;
    document.body.prepend(nav);

    // בדף התרגול המעבר בין שמיעה לקריאה לא טוען את הדף מחדש
    nav.querySelectorAll('.site-links a').forEach(a => {
      a.addEventListener('click', e => {
        const mode = a.dataset.section;
        if (typeof window.setAppMode !== 'function' || mode === 'print') return;
        e.preventDefault();
        window.setAppMode(mode);
        history.replaceState(null, '', '?mode=' + mode);
      });
    });

    setActive(document.body.dataset.section);
  }

  window.SiteNav = { setActive };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
