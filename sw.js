const CACHE = 'nba-bet-v8';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@300;400;500;600&display=swap'
];

// Install — cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for assets
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always network-first for ESPN / proxy API calls
  if (
    url.includes('espn.com') ||
    url.includes('corsproxy') ||
    url.includes('allorigins') ||
    url.includes('workers.dev')
  ) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Cache-first for everything else (fonts, static assets)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (e.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      });
    }).catch(() =>
      new Response(
        `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Offline</title>
        <style>
          body{background:#080c14;color:#e8edf5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;}
          h1{color:#ff6b1a;font-size:2rem;margin:12px 0;}
          p{color:#4a5a72;font-size:14px;}
        </style></head>
        <body>
          <div>
            <div style="font-size:60px">🏀</div>
            <h1>You're Offline</h1>
            <p>Open the app when you have a connection.</p>
          </div>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    )
  );
});
