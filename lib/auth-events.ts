'use client';

// Header/AuthNav — постоянный клиентский компонент в корневом layout, он не
// перемонтируется при обычной навигации (router.push/refresh), поэтому его
// useFetch('/api/me') не перезапускается сам по себе после входа/выхода.
// Явное событие даёт всем подписчикам немедленно перезапросить /api/me.
const AUTH_CHANGED_EVENT = 'auth:changed';

export function notifyAuthChanged(): void {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function onAuthChanged(callback: () => void): () => void {
  window.addEventListener(AUTH_CHANGED_EVENT, callback);
  return () => window.removeEventListener(AUTH_CHANGED_EVENT, callback);
}
