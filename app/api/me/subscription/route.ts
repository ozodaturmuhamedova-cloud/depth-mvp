import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { get } from '@/lib/db';

interface SubscriptionRow {
  plan: string;
  active_until: string;
}

export async function GET() {
  const userId = await getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const subscription = await get<SubscriptionRow>(
    `SELECT plan, active_until FROM subscriptions
     WHERE user_id = ? AND datetime(active_until) > datetime('now')
     ORDER BY active_until DESC LIMIT 1`,
    [userId]
  );

  return NextResponse.json({
    subscription: subscription || null
  });
}
