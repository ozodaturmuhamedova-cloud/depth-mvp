import 'server-only';
import { createHash, createPublicKey, createVerify, randomBytes } from 'crypto';

const ISSUER = 'https://oauth.telegram.org';
const AUTH_URL = `${ISSUER}/auth`;
const TOKEN_URL = `${ISSUER}/token`;
const JWKS_URL = `${ISSUER}/.well-known/jwks.json`;

interface JwkKey {
  kty: string;
  kid: string;
  alg?: string;
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
}

interface JwksResponse {
  keys: JwkKey[];
}

export interface TelegramOidcClaims {
  telegramId: number;
  name: string;
  username: string | null;
}

let jwksCache: JwksResponse | null = null;
let jwksFetchedAt = 0;
const JWKS_TTL_MS = 60 * 60 * 1000;

export function getTelegramClientId(): string {
  const clientId = process.env.TELEGRAM_CLIENT_ID?.trim();
  if (clientId) return clientId;

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const fromToken = token?.split(':')[0];
  if (fromToken) return fromToken;

  throw new Error('TELEGRAM_CLIENT_ID or TELEGRAM_BOT_TOKEN must be set');
}

function getTelegramClientSecret(): string {
  const secret = process.env.TELEGRAM_CLIENT_SECRET?.trim();
  if (!secret) {
    throw new Error('TELEGRAM_CLIENT_SECRET must be set for Telegram OIDC login');
  }
  return secret;
}

export function safeNextPath(value: string | null): string {
  if (!value) return '/dashboard';
  if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function createOAuthState(): string {
  return randomBytes(16).toString('base64url');
}

export function buildRedirectUri(requestUrl: string): string {
  const explicit = process.env.TELEGRAM_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const appUrl = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return new URL('/api/auth/telegram/callback', appUrl.endsWith('/') ? appUrl : `${appUrl}/`).toString();
  }

  return new URL('/api/auth/telegram/callback', requestUrl).toString();
}

export function buildAuthorizationUrl(options: {
  requestUrl: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_id', getTelegramClientId());
  url.searchParams.set('redirect_uri', buildRedirectUri(options.requestUrl));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile');
  url.searchParams.set('state', options.state);
  url.searchParams.set('code_challenge', options.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

async function getJwks(): Promise<JwksResponse> {
  const now = Date.now();
  if (jwksCache && now - jwksFetchedAt < JWKS_TTL_MS) {
    return jwksCache;
  }

  const res = await fetch(JWKS_URL, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch Telegram JWKS: ${res.status}`);
  }

  jwksCache = (await res.json()) as JwksResponse;
  jwksFetchedAt = now;
  return jwksCache;
}

function decodePart(part: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>;
}

async function verifyRs256Jwt(idToken: string, clientId: string): Promise<Record<string, unknown>> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('INVALID_ID_TOKEN');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodePart(encodedHeader);
  const payload = decodePart(encodedPayload);

  if (header.alg !== 'RS256') {
    throw new Error('UNSUPPORTED_JWT_ALG');
  }

  const kid = typeof header.kid === 'string' ? header.kid : null;
  if (!kid) {
    throw new Error('MISSING_JWT_KID');
  }

  const jwks = await getJwks();
  const jwk = jwks.keys.find((key) => key.kid === kid && key.kty === 'RSA');
  if (!jwk?.n || !jwk.e) {
    throw new Error('JWK_NOT_FOUND');
  }

  const publicKey = createPublicKey({
    key: { kty: 'RSA', n: jwk.n, e: jwk.e },
    format: 'jwk',
  });
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  const signature = Buffer.from(encodedSignature, 'base64url');
  if (!verifier.verify(publicKey, signature)) {
    throw new Error('INVALID_ID_TOKEN_SIGNATURE');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== ISSUER) {
    throw new Error('INVALID_ID_TOKEN_ISSUER');
  }

  const aud = payload.aud;
  if (aud !== clientId && aud !== Number(clientId) && String(aud) !== clientId) {
    throw new Error('INVALID_ID_TOKEN_AUDIENCE');
  }

  if (typeof payload.exp !== 'number' || payload.exp < now) {
    throw new Error('ID_TOKEN_EXPIRED');
  }

  return payload;
}

export async function exchangeCodeForClaims(
  code: string,
  requestUrl: string,
  codeVerifier: string
): Promise<TelegramOidcClaims> {
  const clientId = getTelegramClientId();
  const clientSecret = getTelegramClientSecret();
  const redirectUri = buildRedirectUri(requestUrl);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body,
  });

  const tokenJson = (await tokenRes.json().catch(() => null)) as
    | { id_token?: string; error?: string; error_description?: string }
    | null;

  if (!tokenRes.ok || !tokenJson?.id_token) {
    const details = tokenJson?.error_description ?? tokenJson?.error ?? tokenRes.statusText;
    throw new Error(`TOKEN_EXCHANGE_FAILED:${details}`);
  }

  const payload = await verifyRs256Jwt(tokenJson.id_token, clientId);

  // Telegram Bot-API user id comes in `id` (profile scope). OIDC `sub` is a
  // different opaque subject — never use it as telegram_id.
  const rawId = payload.id;
  const telegramId =
    typeof rawId === 'number'
      ? rawId
      : typeof rawId === 'string'
        ? Number(rawId)
        : NaN;

  if (!Number.isInteger(telegramId) || telegramId <= 0) {
    throw new Error('INVALID_TELEGRAM_ID');
  }

  const name =
    (typeof payload.name === 'string' && payload.name.trim()) ||
    [payload.given_name, payload.family_name]
      .filter((part) => typeof part === 'string' && part.trim())
      .join(' ')
      .trim() ||
    (typeof payload.preferred_username === 'string' ? payload.preferred_username : `User ${telegramId}`);

  const username =
    typeof payload.preferred_username === 'string' && payload.preferred_username.trim()
      ? payload.preferred_username.trim()
      : null;

  return { telegramId, name, username };
}
