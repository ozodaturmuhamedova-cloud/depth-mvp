import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createToken, setTokenCookie, getUserIdFromRequest } from '@/lib/auth';
import { exchangeCodeForClaims, safeNextPath } from '@/lib/telegram-oidc';
import { findOrLinkTelegramUser } from '@/lib/telegram-user';
import {
  clearOAuthCookies,
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from '@/lib/telegram-oauth-cookies';

function loginRedirect(request: NextRequest, next: string, error: string): NextResponse {
  const url = new URL('/login', request.url);
  url.searchParams.set('next', next);
  url.searchParams.set('error', error);
  const response = NextResponse.redirect(url);
  clearOAuthCookies(response);
  return response;
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const savedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(OAUTH_VERIFIER_COOKIE)?.value;
  const savedNext = cookieStore.get(OAUTH_NEXT_COOKIE)?.value;
  const next = safeNextPath(savedNext ?? request.nextUrl.searchParams.get('next'));

  const existingUserId = await getUserIdFromRequest();
  if (existingUserId) {
    const response = NextResponse.redirect(new URL(next, request.url));
    clearOAuthCookies(response);
    return response;
  }

  const oauthError = request.nextUrl.searchParams.get('error_description')
    ?? request.nextUrl.searchParams.get('error');
  if (oauthError) {
    return loginRedirect(request, next, oauthError);
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  if (!code || !state || !savedState || !codeVerifier || state !== savedState) {
    return loginRedirect(request, next, 'Авторизация через Telegram не завершена');
  }

  try {
    const claims = await exchangeCodeForClaims(code, request.url, codeVerifier);
    const { user } = await findOrLinkTelegramUser(claims);
    const token = createToken(user.id);
    const response = NextResponse.redirect(new URL(next, request.url));
    setTokenCookie(response, token);
    clearOAuthCookies(response);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'TELEGRAM_USERNAME_CONFLICT') {
      return loginRedirect(request, next, 'Этот Telegram-аккаунт уже привязан к другому пользователю');
    }
    console.error('Telegram OIDC callback error:', error);
    return loginRedirect(request, next, 'Не удалось войти через Telegram');
  }
}
