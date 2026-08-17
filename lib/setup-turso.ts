// Автоматическое создание базы в Turso через Platform API (без CLI).
// Запуск: set TURSO_API_TOKEN=<токен> && npm run setup:turso
//
// 1. Создаёт (если нет) базу TURSO_DB_NAME (по умолчанию "ozoda-books") в группе "default"
// 2. Генерирует токен доступа к базе
// 3. Печатает TURSO_DATABASE_URL и TURSO_AUTH_TOKEN
//
// Важно: переименование здесь НЕ переименовывает уже существующую базу в Turso.
// Если раньше использовалась база "depth" и в ней есть данные, либо оставьте
// TURSO_DATABASE_URL указывающим на неё, либо перелейте данные через `npm run migrate`.

const API = 'https://api.turso.tech';

const TOKEN = process.env.TURSO_API_TOKEN;
if (!TOKEN) {
  console.error('Задайте TURSO_API_TOKEN (токен из turso.tech → Settings → Tokens)');
  process.exit(1);
}

const DB_NAME = process.env.TURSO_DB_NAME ?? 'ozoda-books';

interface TursoOrganization {
  slug: string;
}

interface TursoDatabase {
  Name: string;
  Hostname: string;
}

interface TursoGroup {
  name: string;
}

type ApiResponse = {
  organizations?: TursoOrganization[];
  databases?: TursoDatabase[];
  groups?: TursoGroup[];
  database?: TursoDatabase;
  locations?: Record<string, string>;
  jwt?: string;
} & Record<string, unknown>;

async function api(path: string, init: RequestInit = {}): Promise<ApiResponse> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: ApiResponse = {};
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
  const existing = list.databases?.find((d) => d.Name === DB_NAME);

  let hostname: string;
  if (existing) {
    hostname = existing.Hostname;
    console.log(`База "${DB_NAME}" уже существует: ${hostname}`);
  } else {
    // Группа "default" обычно создаётся при регистрации; если нет — создаём
    const groupsRes = await api(`/v1/organizations/${org}/groups`);
    const groups = groupsRes.groups ?? [];
    if (!groups.some((g) => g.name === 'default')) {
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
      body: JSON.stringify({ name: DB_NAME, group: 'default' }),
    });
    if (!created.database?.Hostname) {
      throw new Error('Turso API не вернул hostname созданной базы');
    }
    hostname = created.database.Hostname;
    console.log(`База "${DB_NAME}" создана: ${hostname}`);
  }

  // Токен доступа к базе. Вечный токен с полным доступом (expiration=never)
  // — серьёзный риск при утечке (лог CI, случайный коммит и т.п.), поэтому
  // ограничиваем срок действия; обновляйте токен повторным запуском скрипта.
  const TOKEN_EXPIRATION = process.env.TURSO_TOKEN_EXPIRATION ?? '90d';
  const tokenRes = await api(
    `/v1/organizations/${org}/databases/${DB_NAME}/auth/tokens?expiration=${TOKEN_EXPIRATION}&authorization=full-access`,
    { method: 'POST' }
  );

  console.log(`\nТокен действителен ${TOKEN_EXPIRATION}. НЕ коммитьте его в git — только в .env.local (в .gitignore).`);
  console.log('Запишите в .env.local:');
  console.log(`TURSO_DATABASE_URL=libsql://${hostname}`);
  console.log(`TURSO_AUTH_TOKEN=${tokenRes.jwt}`);
}

main().catch((err) => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});
