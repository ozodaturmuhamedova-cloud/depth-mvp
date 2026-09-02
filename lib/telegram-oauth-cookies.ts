import 'server-only';
import { NextResponse } from 'next/server';

const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 10,
  path: '/',
};

export const OAUTH_STATE_COOKIE = 'tg_oauth_state';
export const OAUTH_VERIFIER_COOKIE = 'tg_oauth_verifier';
export const OAUTH_NEXT_COOKIE = 'tg_oauth_next';

export function setOAuthCookies(
  response: NextResponse,
  values: { state: string; verifier: string; next: string }
): void {
  response.cookies.set(OAUTH_STATE_COOKIE, values.state, OAUTH_COOKIE_OPTIONS);
  response.cookies.set(OAUTH_VERIFIER_COOKIE, values.verifier, OAUTH_COOKIE_OPTIONS);
  response.cookies.set(OAUTH_NEXT_COOKIE, values.next, OAUTH_COOKIE_OPTIONS);
}

export function clearOAuthCookies(response: NextResponse): void {
  for (const name of [OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE, OAUTH_NEXT_COOKIE]) {
    response.cookies.set(name, '', { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 });
  }
}
