// Service Worker: macht die App offline nutzbar (Aufbau wie beim Setlist-Tool).
//
// - Alle App-Dateien liegen im Cache „aktiv“ und werden von dort geliefert (auch ohne Internet).
// - Mit Internet lädt die Seite nach dem Start im Hintergrund alle Dateien neu in den Cache „neu“.
//   Unterscheiden sie sich, wird der neue Stand erst beim NÄCHSTEN Start der App übernommen –
//   nie mitten in einer laufenden Sitzung, und immer vollständig.
// - Auf localhost (Entwicklung) gilt „Netz zuerst“, damit Änderungen sofort sichtbar sind.
//
// Wichtig: Alle Apps unter andreasnickel.github.io teilen sich einen Cache-Speicher.
// Die Cache-Namen müssen deshalb je App eindeutig sein (hier „griffbrett-…“).

const DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

const AKTIV = 'griffbrett-app';
const NEU = 'griffbrett-app-neu';
const STAND = './__stand'; // Zeitpunkt, zu dem der Stand geladen wurde
const LOKAL = ['localhost', '127.0.0.1'].includes(self.location.hostname);

const url = (pfad) => new URL(pfad, self.registration.scope).href;

/** Lädt alle Dateien frisch in den angegebenen Cache. Wirft, wenn eine fehlt. */
async function ladeAlle(name) {
  await caches.delete(name);
  const cache = await caches.open(name);
  await Promise.all(
    DATEIEN.map(async (pfad) => {
      const antwort = await fetch(url(pfad), { cache: 'reload' });
      if (!antwort.ok) throw new Error(`${pfad}: ${antwort.status}`);
      await cache.put(url(pfad), antwort);
    })
  );
  await cache.put(url(STAND), new Response(JSON.stringify({ geladen: new Date().toISOString() })));
  return cache;
}

async function istLeer(name) {
  if (!(await caches.has(name))) return true;
  return !(await (await caches.open(name)).match(url('./index.html')));
}

/** Vergleicht zwei Caches inhaltlich (ohne den Zeitstempel). */
async function unterscheiden(a, b) {
  for (const pfad of DATEIEN) {
    const [x, y] = await Promise.all([a.match(url(pfad)), b.match(url(pfad))]);
    if (!x || !y) return true;
    const [tx, ty] = await Promise.all([x.arrayBuffer(), y.arrayBuffer()]);
    if (tx.byteLength !== ty.byteLength) return true;
    const ux = new Uint8Array(tx);
    const uy = new Uint8Array(ty);
    for (let i = 0; i < ux.length; i++) if (ux[i] !== uy[i]) return true;
  }
  return false;
}

/** Wartender neuer Stand → wird zum aktiven (nur beim Start der App aufgerufen). */
async function uebernehmeNeu() {
  if (!(await caches.has(NEU))) return;
  const neu = await caches.open(NEU);
  if (!(await neu.match(url(STAND)))) return; // unvollständig
  await caches.delete(AKTIV);
  const aktiv = await caches.open(AKTIV);
  for (const anfrage of await neu.keys()) await aktiv.put(anfrage, await neu.match(anfrage));
  await caches.delete(NEU);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Erste Installation: direkt in den aktiven Cache. Sonst (neue sw.js) als wartendes Update.
      if (await istLeer(AKTIV)) await ladeAlle(AKTIV);
      else await ladeAlle(NEU).catch(() => caches.delete(NEU));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Die Seite schickt nach dem Start „pruefen“: neuen Stand im Hintergrund laden und bereitlegen.
self.addEventListener('message', (event) => {
  if (event.data?.art !== 'pruefen') return;
  event.waitUntil(
    (async () => {
      try {
        const kandidat = await ladeAlle(NEU + '-pruefung');
        const aktiv = await caches.open(AKTIV);
        if (await unterscheiden(kandidat, aktiv)) {
          await caches.delete(NEU);
          const neu = await caches.open(NEU);
          for (const anfrage of await kandidat.keys()) await neu.put(anfrage, await kandidat.match(anfrage));
        }
      } catch (e) {
        console.warn('Update-Prüfung fehlgeschlagen:', e);
      } finally {
        await caches.delete(NEU + '-pruefung');
      }
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const anfrage = event.request;
  if (anfrage.method !== 'GET' || !anfrage.url.startsWith(self.registration.scope)) return;

  if (anfrage.mode === 'navigate') {
    event.respondWith(
      (async () => {
        if (!LOKAL) await uebernehmeNeu(); // neuer Stand nur beim Start der App
        return liefere(url('./index.html'), anfrage);
      })()
    );
    return;
  }
  event.respondWith(liefere(anfrage.url.split('#')[0].split('?')[0], anfrage));
});

async function liefere(schluessel, anfrage) {
  const aktiv = await caches.open(AKTIV);
  if (LOKAL) {
    try {
      const antwort = await fetch(anfrage);
      if (antwort.ok) aktiv.put(schluessel, antwort.clone());
      return antwort;
    } catch {
      return (await aktiv.match(schluessel)) || Response.error();
    }
  }
  const gespeichert = await aktiv.match(schluessel);
  if (gespeichert) return gespeichert;
  try {
    const antwort = await fetch(anfrage);
    if (antwort.ok) aktiv.put(schluessel, antwort.clone()); // vergessene Datei nachträglich merken
    return antwort;
  } catch {
    return Response.error();
  }
}
