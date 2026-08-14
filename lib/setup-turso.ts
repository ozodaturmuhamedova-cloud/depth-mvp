// Автоматическое создание базы в Turso через Platform API (без CLI).
// Запуск: set TURSO_API_TOKEN=<токен> && npm run setup:turso
//
// 1. Создаёт (если нет) базу "depth" в группе "default"
// 2. Генерирует токен доступа к базе
// 3. Печатает TURSO_DATABASE_URL и TURSO_AUTH_TOKEN

const API = 'https://api.turso.tech';

const TOKEN = process.env.TURSO_API_TOKEN;
if (!TOKEN) {
  console.error('Задайте TURSO_API_TOKEN (токен из turso.tech → Settings → Tokens)');
  process.exit(1);
}

async function api(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${init.method || 'GET'} ${path} → ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  // Организация (личный аккаунт)
  const orgsRes = await api('/v1/organizations');
  const orgsList = Array.isArray(orgsRes) ? orgsRes : orgsRes.organizations;
  const org = orgsList?.[0]?.slug;
  if (!org) throw new Error('Не найдена организация. Убедитесь, что аккаунт Turso создан.');

  // Существующие базы
  const list = await api(`/v1/organizations/${org}/databases`);
  const existing = list.databases?.find((d: any) => d.Name === 'depth');

  let hostname: string;
  if (existing) {
    hostname = existing.Hostname;
    console.log(`База "depth" уже существует: ${hostname}`);
  } else {
    // Группа "default" обычно создаётся при регистрации; если нет — создаём
    const groupsRes = await api(`/v1/organizations/${org}/groups`);
    const groups = groupsRes.groups ?? [];
    if (!groups.some((g: any) => g.name === 'default')) {
      const locationsRes = await api('/v1/locations');
      const codes = Object.keys(locationsRes.locations ?? {});
      const location = codes.find((c) => c.startsWith('aws-eu-west-')) ?? codes[0] ?? 'lhr';
      await api(`/v1/organizations/${org}/groups`, {
        method: 'POST',
        body: JSON.stringify({ name: 'default', location }),
      });
      console.log(`Группа "default" создана (${location})`);
    }

    const created = await api(`/v1/organizations/${org}/databases`, {
      method: 'POST',
      body: JSON.stringify({ name: 'depth', group: 'default' }),
    });
    hostname = created.database?.Hostname;
    console.log(`База "depth" создана: ${hostname}`);
  }

  // Токен доступа к базе
  const tokenRes = await api(
    `/v1/organizations/${org}/databases/depth/auth/tokens?expiration=never&authorization=full-access`,
    { method: 'POST' }
  );

  console.log('\nЗапишите в .env.local:');
  console.log(`TURSO_DATABASE_URL=libsql://${hostname}`);
  console.log(`TURSO_AUTH_TOKEN=${tokenRes.jwt}`);
}

main().catch((err) => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});
