import 'server-only';

export function getTelegramAdminId(): number | null {
  const raw = process.env.TELEGRAM_ADMIN_ID?.trim();
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
