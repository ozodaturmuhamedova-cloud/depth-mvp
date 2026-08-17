import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { get } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-insecure-secret';
if (process.env.NODE_ENV !== 'development' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}

const TOKEN_EXPIRATION = '7d';

export interface UserRow {
  id: number;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export function setTokenCookie(response: NextResponse, token: string) {
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export function clearTokenCookie(response: NextResponse) {
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

export async function getUserIdFromRequest(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

// Возвращает текущего пользователя (из cookie + БД) или null
export async function getCurrentUser(): Promise<UserRow | null> {
  const userId = await getUserIdFromRequest();
  if (!userId) return null;
  const user = await get<UserRow>(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
    [userId]
  );
  return user ?? null;
}

// Для роутов, требующих авторизации: null -> 401
export async function requireUser(): Promise<UserRow | null> {
  return getCurrentUser();
}

// Для админ-роутов: null -> 403
export async function requireAdmin(): Promise<UserRow | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return null;
  return user;
}

// Проверка активной подписки (сравнение в UTC)
export async function hasActiveSubscription(userId: number): Promise<boolean> {
  const row = await get<{ id: number }>(
    `SELECT id FROM subscriptions
     WHERE user_id = ? AND datetime(active_until) > datetime('now')`,
    [userId]
  );
  return !!row;
}
