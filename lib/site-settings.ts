import 'server-only';
import { all } from '@/lib/db';
import type { SiteSettings } from '@/lib/types';

export const SITE_SETTINGS_KEYS = [
  'hero_image_url',
  'hero_author_name',
  'hero_author_role',
  'header_portrait_url',
] as const;

export type SiteSettingsKey = (typeof SITE_SETTINGS_KEYS)[number];

export function emptySiteSettings(): SiteSettings {
  return {
    hero_image_url: null,
    hero_author_name: null,
    hero_author_role: null,
    header_portrait_url: null,
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const settings = emptySiteSettings();
  try {
    const rows = await all<{ key: string; value: string }>('SELECT key, value FROM site_settings');
    for (const row of rows) {
      if ((SITE_SETTINGS_KEYS as readonly string[]).includes(row.key) && row.value) {
        settings[row.key as SiteSettingsKey] = row.value;
      }
    }
  } catch (error) {
    console.error('Site settings load error:', error);
  }
  return settings;
}
