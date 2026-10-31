/**
 * Registers public/sw.js so the web app installs as a PWA and opens offline.
 * Skipped in development so the dev server's live reload isn't cached.
 */
export function registerServiceWorker(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
    console.warn('Service worker registration failed', error);
  });
}
