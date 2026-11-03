// עבודה בלי אינטרנט.
// כשיש רשת, כל בקשה הולכת לרשת קודם (כך האתר תמיד עדכני, בדיוק כמו בלי ה-service worker),
// והתשובה נשמרת בצד. כשאין רשת, או שהרשת תקועה יותר מכמה שניות, עונים מהעותק השמור.
// בהתקנה שומרים מראש את הדפים והקבצים הבסיסיים, כדי שגם דף שעוד לא נפתח יעבוד בלי רשת.
// דגימות שאר הכלים נשמרות כשהן נטענות בפעם הראשונה.
const CACHE = 'site-v1';
const SLOW_NETWORK_MS = 4000;

const PRECACHE = [
  './',
  'index.html',
  'music_theory_exercise_tool.html',
  'rhythm_practice.html',
  'music_theory_worksheets_generator.html',
  'music_theory_algorythm.html',
  'manifest.webmanifest',
  'fonts/fonts.css',
  'fonts/assistant.woff2',
  'site-nav.js',
  'theory-core.js',
  'rhythm-core.js',
  'rewards.js',
  'rewards.css',
  'update-check.js',
  'practice/practice.css',
  'practice/state.js',
  'practice/audio.js',
  'practice/notation.js',
  'practice/settings.js',
  'practice/exercise.js',
  'practice/training.js',
  'practice/hints.js',
  'practice/main.js',
  'vendor/jspdf.umd.min.js',
  'vendor/html2canvas.min.js',
  'icons/icon.svg',
  'icons/favicon-32.png',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  // הנבל, הכלי שנבחר כברירת מחדל, כדי שאפשר לשמוע גם בלי רשת. כלים אחרים נשמרים כשבוחרים בהם
  'sounds/harp/G1.mp3',
  'sounds/harp/D2.mp3',
  'sounds/harp/F2.mp3',
  'sounds/harp/A2.mp3',
  'sounds/harp/C3.mp3',
  'sounds/harp/E3.mp3',
  'sounds/harp/G3.mp3',
  'sounds/harp/B3.mp3',
  'sounds/harp/D4.mp3',
  'sounds/harp/F4.mp3',
  'sounds/harp/A4.mp3',
  'sounds/harp/C5.mp3',
  'sounds/harp/E5.mp3',
  'sounds/harp/G5.mp3',
  'sounds/harp/B5.mp3',
  'sounds/harp/D6.mp3',
];

// מפתח השמירה בלי ?v=..., כדי שהעותק יימצא גם כשהדף מבקש גרסה אחרת
function key(url) {
  const u = new URL(url);
  u.search = '';
  u.hash = '';
  return u.href;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // קובץ אחד שנכשל לא מפיל את כל ההתקנה
    await Promise.allSettled(PRECACHE.map(async path => {
      const res = await fetch(new Request(path, { cache: 'reload' }));
      if (res.ok) await cache.put(key(res.url || new URL(path, self.registration.scope).href), res);
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // בדיקת הגרסה תמיד מהרשת
  if (url.pathname.endsWith('/version.json')) return;
  // בקשות טווח (למשל ניגון קובץ שמע ישירות) עוברות כרגיל
  if (req.headers.has('range')) return;
  event.respondWith(networkFirst(event, req));
});

async function fromCache(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(key(req.url));
  if (hit) return hit;
  if (req.mode === 'navigate') return cache.match(key(new URL('index.html', self.registration.scope).href));
  return undefined;
}

async function networkFirst(event, req) {
  const network = fetch(req).then(res => {
    if (res.ok && res.type === 'basic') {
      const copy = res.clone();
      event.waitUntil(caches.open(CACHE).then(c => c.put(key(req.url), copy)));
    }
    return res;
  });
  // רשת איטית: אחרי כמה שניות עונים מהעותק השמור, אם יש כזה. אחרת ממשיכים לחכות לרשת
  const slow = new Promise(resolve => setTimeout(resolve, SLOW_NETWORK_MS)).then(() => fromCache(req))
    .then(hit => hit || network);
  try {
    return await Promise.race([network, slow]);
  } catch (e) {
    const hit = await fromCache(req);
    if (hit) return hit;
    throw e;
  }
}
