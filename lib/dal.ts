import 'server-only';
import { cache } from 'react';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser, type UserRow } from '@/lib/auth';

// Мемоизируем на время одного рендера, чтобы повторные вызовы в разных
// компонентах не били по БД лишний раз (см. рекомендацию Next.js по DAL).
export const getSessionUser = cache(async (): Promise<UserRow | null> => {
  return getCurrentUser();
});

// Для страниц, доступных только авторизованным пользователям.
export async function requireUserOrRedirect(nextPath?: string): Promise<UserRow> {
  const user = await getSessionUser();
  if (!user) {
    const suffix = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
    redirect(`/login${suffix}`);
  }
  return user;
}

// Для страниц, доступных только гостям (login/register). Авторизованных
// уводим в кабинет — как на уровне Proxy (оптимистично), так и здесь
// (достоверно, по данным из БД), согласно рекомендации не полагаться
// на Proxy как единственный рубеж защиты.
export async function redirectIfAuthenticated(): Promise<void> {
  const user = await getSessionUser();
  if (user) {
    redirect('/dashboard');
  }
}

// Для админ-панели: обычный пользователь и гость получают 404, а не
// подсказку о существовании защищённого раздела.
export async function requireAdminOrNotFound(): Promise<UserRow> {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    notFound();
  }
  return user;
}
