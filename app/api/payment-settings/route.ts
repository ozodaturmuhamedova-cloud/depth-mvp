import { NextResponse } from 'next/server';
import { emptyPaymentSettings, getPaymentSettings } from '@/lib/payment-settings';

export async function GET() {
  try {
    const settings = await getPaymentSettings();
    return NextResponse.json({ settings: settings ?? emptyPaymentSettings() });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
