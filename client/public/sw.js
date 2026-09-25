// Service worker for the kitchen app (registered from /kitchen only). It exists so
// browsers offer "Install app", and to show a friendly page instead of the browser's
// error screen when the tablet opens the app without a connection.
// It never caches the app or /api: orders must always come from the server.
const OFFLINE_CACHE = "mardinis-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(OFFLINE_CACHE)
			.then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener("fetch", (event) => {
	if (event.request.mode !== "navigate") return;
	event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
