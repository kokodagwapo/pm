/**
 * PropertyPro - Service Worker
 * Provides offline functionality and caching for PWA
 * NOTE: Only caches static assets and public pages. Authenticated API
 * responses are NEVER cached to prevent PII exposure on shared devices.
 */

const CACHE_NAME = "SmartStartPM-v1.5.0";
const STATIC_CACHE_NAME = "SmartStartPM-static-v1.5.0";
const DYNAMIC_CACHE_NAME = "SmartStartPM-dynamic-v1.5.0";

/** Do not precache `/` — HTML must not be stuck on an old marketing shell after deploys. */
const STATIC_ASSETS = [
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("Service Worker: Static assets cached");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("Service Worker: Failed to cache static assets", error);
      })
  );
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName !== CACHE_NAME
            ) {
              console.log("Service Worker: Deleting old cache", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("Service Worker: Activated");
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.protocol === "chrome-extension:") {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Never intercept Next.js build artifacts. They are already content-hashed,
  // and stale service-worker caches are a common source of broken deploys.
  if (url.pathname.startsWith("/_next/")) {
    return;
  }

  event.respondWith(handlePageRequest(request));
});

async function handlePageRequest(request) {
  try {
    const accept = request.headers.get("accept") || "";
    const isHtmlDocument =
      request.mode === "navigate" || accept.includes("text/html");

    // HTML: network-first so landing and app routes always pick up new deploys.
    if (isHtmlDocument) {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          const cache = await caches.open(DYNAMIC_CACHE_NAME);
          await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
      }
    } else {
      const cachedResponse = await caches.match(request);
      const networkResponsePromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const cache = caches.open(DYNAMIC_CACHE_NAME);
            cache.then((c) => c.put(request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => null);

      if (cachedResponse) {
        return cachedResponse;
      }

      const networkResponse = await networkResponsePromise;
      if (networkResponse) {
        return networkResponse;
      }
    }

    return (
      caches.match("/offline.html") ||
      new Response(
        `<!DOCTYPE html>
      <html>
        <head>
          <title>SmartStartPM - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, sans-serif; 
              text-align: center; 
              padding: 2rem;
              background: #f8fafc;
            }
            .container {
              max-width: 400px;
              margin: 0 auto;
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .icon { font-size: 3rem; margin-bottom: 1rem; }
            h1 { color: #1f2937; margin-bottom: 1rem; }
            p { color: #6b7280; margin-bottom: 2rem; }
            button {
              background: #4f46e5;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 6px;
              cursor: pointer;
              font-size: 1rem;
            }
            button:hover { background: #4338ca; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📱</div>
            <h1>You're Offline</h1>
            <p>SmartStartPM is not available right now. Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>`,
        {
          headers: { "Content-Type": "text/html" },
        }
      )
    );
  } catch (error) {
    console.error("Service Worker: Page request failed", error);
    throw error;
  }
}

self.addEventListener("sync", (event) => {
  console.log("Service Worker: Background sync triggered", event.tag);
});

self.addEventListener("push", (event) => {
  console.log("Service Worker: Push notification received");

  const options = {
    body: event.data ? event.data.text() : "New notification from SmartStartPM",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "View Details",
      },
      {
        action: "close",
        title: "Close",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("SmartStartPM", options));
});

self.addEventListener("notificationclick", (event) => {
  console.log("Service Worker: Notification clicked");

  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/dashboard"));
  }
});

self.addEventListener("message", (event) => {
  console.log("Service Worker: Message received", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
