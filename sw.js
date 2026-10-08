/* PDSYO service worker v4 — অফলাইন সহায়তা
   - পেজ/আইকন: নেটওয়ার্ক আগে, না পেলে জমানো কপি (অফলাইনেও অ্যাপ খোলে)
   - ছবি ও ফন্ট (অন্য সাইট থেকে আসা): জমানো কপি আগে দেখায়, পেছনে নতুন কপি এনে রাখে
   - অডিও/Range অনুরোধ ও API সরাসরি নেটওয়ার্কে (পেজ নিজে জমায়) */
const CACHE = "pdsyo-v5", MEDIA = "pdsyo-media", IMG = "pdsyo-img", FONT = "pdsyo-font";
const KEEP = [CACHE, MEDIA, IMG, FONT];
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => KEEP.indexOf(k) === -1).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function trim(c, max) {
  return c.keys().then(ks => ks.length > max ? Promise.all(ks.slice(0, ks.length - max).map(k => c.delete(k))) : null);
}
function swr(e, name, req, max) {
  return caches.open(name).then(c => c.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) {
        const copy = res.clone();
        c.put(req, copy).then(() => trim(c, max)).catch(() => {});
      }
      return res;
    }).catch(() => hit || Response.error());
    e.waitUntil(net.catch(() => {}));
    return hit || net;
  }));
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
      e.respondWith(swr(e, FONT, req, 20)); return;
    }
    if (req.destination === "image") { e.respondWith(swr(e, IMG, req, 80)); return; }
    return; // API, Google লগইন ইত্যাদি সরাসরি নেটওয়ার্কে
  }
  if (/\.(mp3|ogg|wav|m4a)$/i.test(url.pathname)) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req).then(r => r || (req.mode === "navigate" ? caches.match("index.html") : Response.error())))
  );
});

