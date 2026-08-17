import 'server-only';
import { NextRequest } from 'next/server';

/**
 * Проверка происхождения запроса для мутирующих маршрутов (POST/PUT/DELETE).
 * `sameSite: 'lax'` у cookie сам по себе не защищает от CSRF (например, при
 * навигации по обычной ссылке или переходе с других поддоменов), поэтому
 * дополнительно сверяем Origin/Sec-Fetch-Site с ожидаемым хостом запроса.
 */
export function isTrustedOrigin(request: NextRequest): boolean {
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'same-origin' || secFetchSite === 'none') {
    return true;
  }

  const origin = request.headers.get('origin');
  if (!origin) {
    // Старые браузеры/клиенты без fetch metadata и Origin — не блокируем,
    // чтобы не ломать легитимные не-браузерные интеграции, но это редкий случай
    // для POST-запросов из браузера с телом JSON/FormData.
    return true;
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host === request.nextUrl.host;
  } catch {
    return false;
  }
}
