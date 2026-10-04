const CACHE_NAME = "pdsyo-v3";

// অ্যাপের মূল স্ট্যাটিক ফাইলসমূহ
const STATIC_ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png"
];

// ১. সার্ভিস ওয়ার্কার ইনস্টল ও ফাইল ক্যাশ
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ২. পুরোনো ক্যাশ মুছে ফেলা ও অ্যাক্টিভেশন
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ৩. নেটওয়ার্ক ও ক্যাশ ম্যানেজমেন্ট (Fetch Handling)
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // শুধুমাত্র GET রিকোয়েস্ট প্রক্রিয়াজাত হবে
  if (req.method !== "GET") return;

  // Audio/Media এবং Range Requests ক্যাশ থেকে বাদ (যাতে জাতীয় সংগীত অডিও চলাতে সমস্যা না হয়)
  if (req.headers.has("range") || /\.(mp3|ogg|wav|m4a)$/i.test(url.pathname)) {
    return;
  }

  // অ্যাপস স্ক্রিপ্ট API রিকোয়েস্ট (রক্তদাতা ডাটা অফলাইনে চালানোর জন্য networkFirst স্ট্র্যাটেজি)
  if (url.href.includes("script.google.com")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // স্ট্যাটিক ফাইলসমূহের জন্য (Cache First / Stale-While-Revalidate)
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((cachedRes) => {
        const fetchPromise = fetch(req).then((networkRes) => {
          if (networkRes.ok) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkRes;
        }).catch(() => {});

        return cachedRes || fetchPromise || caches.match("index.html");
      })
    );
  }
});
