import 'server-only';
import { all } from '@/lib/db';
import type { PaymentSettings } from '@/lib/types';

export const PAYMENT_SETTINGS_KEYS = [
  'payment_card_number',
  'payment_card_holder',
  'payment_telegram_url',
  'price_month',
  'price_year',
] as const;

export type PaymentSettingsKey = (typeof PAYMENT_SETTINGS_KEYS)[number];

export function emptyPaymentSettings(): PaymentSettings {
  return {
    payment_card_number: null,
    payment_card_holder: null,
    payment_telegram_url: null,
    price_month: null,
    price_year: null,
  };
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const settings = emptyPaymentSettings();
  try {
    const rows = await all<{ key: string; value: string }>('SELECT key, value FROM site_settings');
    for (const row of rows) {
      if ((PAYMENT_SETTINGS_KEYS as readonly string[]).includes(row.key) && row.value) {
        settings[row.key as PaymentSettingsKey] = row.value;
      }
    }
  } catch (error) {
    console.error('Payment settings load error:', error);
  }
  return settings;
}
