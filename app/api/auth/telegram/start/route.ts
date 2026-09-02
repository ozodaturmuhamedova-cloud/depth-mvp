import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import {
  buildAuthorizationUrl,
  createOAuthState,
  createPkcePair,
  safeNextPath,
} from '@/lib/telegram-oidc';
import { setOAuthCookies } from '@/lib/telegram-oauth-cookies';

export async function GET(request: NextRequest) {
  const existingUserId = await getUserIdFromRequest();
  const next = safeNextPath(request.nextUrl.searchParams.get('next'));

  if (existingUserId) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  try {
    const state = createOAuthState();
    const { verifier, challenge } = createPkcePair();
    const response = NextResponse.redirect(
      buildAuthorizationUrl({
        requestUrl: request.url,
        state,
        codeChallenge: challenge,
      })
    );
    setOAuthCookies(response, { state, verifier, next });
    return response;
  } catch (error) {
    console.error('Telegram OAuth start error:', error);
    const url = new URL('/login', request.url);
    url.searchParams.set('next', next);
    url.searchParams.set('error', 'Telegram OIDC не настроен на сервере');
    return NextResponse.redirect(url);
  }
}
