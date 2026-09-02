import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Начиная с Next.js 16 Middleware называется Proxy (тот же механизм, Node.js
// runtime по умолчанию — см. node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md).
//
// Это только ОПТИМИСТИЧНАЯ проверка по подписи куки, без обращения к БД
// (Proxy выполняется в том числе на prefetch-запросах). Достоверная проверка
// роли всегда выполняется на сервере через lib/dal.ts — см. requireAdminOrNotFound
// и requireUserOrRedirect, которые полагаются на данные из БД, а не только на JWT.

const GUEST_ONLY_ROUTES = ['/login'];
const PROTECTED_PREFIXES = ['/dashboard', '/admin'];

function isProtectedPath(pathname: string): boolean {
  if (PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  // /books/<slug>/read — платный контент, требует авторизации
  return /^\/books\/[^/]+\/read\/?$/.test(pathname);
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('token')?.value;
  const isAuthenticated = !!token && !!verifyToken(token);

  if (GUEST_ONLY_ROUTES.includes(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isProtectedPath(pathname) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
