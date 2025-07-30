// A unique name for the cache
const CACHE_NAME = 'scripture-names-v1';

// The list of files to be cached
const urlsToCache = [
  '/',
  'index.html',
  'index.css',
  'index.js',
  'data.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Lora:wght@400;500;700&display=swap'
];

/**
 * Installation event
 * This is called when the service worker is first installed.
 */
self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Add all the specified URLs to the cache
        return cache.addAll(urlsToCache);
      })
  );
});

/**
 * Fetch event
 * This is called for every request the page makes.
 * It tries to serve the request from the cache first. If not found, it fetches from the network.
 */
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return the cached response
        if (response) {
          return response;
        }

        // Not in cache - fetch from the network
        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Cache the new response for future use
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

/**
 * Activate event
 * This is called when the service worker is activated.
 * It's a good place to clean up old caches.
 */
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // If the cache name is not in our whitelist, delete it
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
