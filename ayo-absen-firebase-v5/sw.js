const C = "ayo-v5",
  F = [
    "siswa.html",
    "guru.html",
    "ortu.html",
    "admin.html",
    "ayo-firebase.js",
    "ayo-app.js",
    "ayo.css",
    "manifest-siswa.json",
    "manifest-guru.json",
    "manifest-ortu.json",
    "manifest-admin.json",
  ];
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(C)
      .then((c) => Promise.allSettled(F.map((f) => c.add(f))))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((k) => Promise.all(k.filter((x) => x !== C).map((x) => caches.delete(x))))
      .then(() => clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const c = r.clone();
          caches.open(C).then((x) => x.put(e.request, c));
        }
        return r;
      })
      .catch(() => caches.match(e.request)),
  );
});
