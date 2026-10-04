const CACHE = "pdsyo-v2";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  // API/Google ফাইল, অডিও ও Range অনুরোধ সরাসরি নেটওয়ার্কে (অডিও চালাতে সমস্যা এড়াতে)
  if (req.method !== "GET" || url.origin !== self.location.origin ||
      req.headers.has("range") || /\.(mp3|ogg|wav|m4a)$/i.test(url.pathname)) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("index.html")))
  );
});

