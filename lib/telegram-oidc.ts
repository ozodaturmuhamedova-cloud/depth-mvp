import 'server-only';
import {
  createHash,
  createPublicKey,
  createVerify,
  randomBytes,
  verify as cryptoVerify,
  type KeyObject,
} from 'crypto';

const ISSUER = 'https://oauth.telegram.org';
const AUTH_URL = `${ISSUER}/auth`;
const TOKEN_URL = `${ISSUER}/token`;
const JWKS_URL = `${ISSUER}/.well-known/jwks.json`;

/** Algorithms Telegram advertises in discovery / JWKS. */
const SUPPORTED_ALGS = new Set(['RS256', 'ES256', 'EdDSA', 'ES256K'] as const);
type TelegramJwtAlg = 'RS256' | 'ES256' | 'EdDSA' | 'ES256K';

interface JwkKey {
  kty: string;
  kid: string;
  alg?: string;
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
  y?: string;
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
  // profile нужен для claim `id` (Bot-API user id). ES256K/EdDSA в BotFather
  // Advanced несовместимы с profile — там нужен RS256 или ES256.
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

  const res = await fetch(JWKS_URL, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  });
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

function findJwk(jwks: JwksResponse, kid: string, alg: TelegramJwtAlg): JwkKey | undefined {
  return jwks.keys.find((key) => key.kid === kid && (!key.alg || key.alg === alg));
}

function publicKeyFromJwk(jwk: JwkKey, alg: TelegramJwtAlg): KeyObject {
  if (alg === 'RS256') {
    if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) {
      throw new Error('JWK_NOT_FOUND');
    }
    return createPublicKey({
      key: { kty: 'RSA', n: jwk.n, e: jwk.e },
      format: 'jwk',
    });
  }

  if (alg === 'ES256' || alg === 'ES256K') {
    const expectedCrv = alg === 'ES256' ? 'P-256' : 'secp256k1';
    if (jwk.kty !== 'EC' || jwk.crv !== expectedCrv || !jwk.x || !jwk.y) {
      throw new Error('JWK_CURVE_MISMATCH');
    }
    return createPublicKey({
      key: { kty: 'EC', crv: jwk.crv, x: jwk.x, y: jwk.y },
      format: 'jwk',
    });
  }

  // EdDSA / Ed25519
  if (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || !jwk.x) {
    throw new Error('JWK_NOT_FOUND');
  }
  return createPublicKey({
    key: { kty: 'OKP', crv: 'Ed25519', x: jwk.x },
    format: 'jwk',
  });
}

/**
 * Ручная проверка id_token по JWKS Telegram:
 * RS256, ES256 (P-256), EdDSA (Ed25519), ES256K (secp256k1).
 * ECDSA-подписи в JWT — IEEE P1363 (r||s), не DER.
 */
export async function verifyTelegramIdToken(
  idToken: string,
  clientId: string
): Promise<Record<string, unknown>> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('INVALID_ID_TOKEN');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodePart(encodedHeader);
  const payload = decodePart(encodedPayload);

  const alg = header.alg;
  if (typeof alg !== 'string' || !SUPPORTED_ALGS.has(alg as TelegramJwtAlg)) {
    throw new Error(`UNSUPPORTED_JWT_ALG:${String(alg)}`);
  }
  const jwtAlg = alg as TelegramJwtAlg;

  const kid = typeof header.kid === 'string' ? header.kid : null;
  if (!kid) {
    throw new Error('MISSING_JWT_KID');
  }

  const jwks = await getJwks();
  const jwk = findJwk(jwks, kid, jwtAlg);
  if (!jwk) {
    // Ключ мог ротироваться — сбросим кэш и попробуем ещё раз.
    jwksCache = null;
    jwksFetchedAt = 0;
    const fresh = await getJwks();
    const retry = findJwk(fresh, kid, jwtAlg);
    if (!retry) {
      throw new Error('JWK_NOT_FOUND');
    }
    return verifyWithJwk(encodedHeader, encodedPayload, encodedSignature, payload, clientId, jwtAlg, retry);
  }

  return verifyWithJwk(encodedHeader, encodedPayload, encodedSignature, payload, clientId, jwtAlg, jwk);
}

function verifyWithJwk(
  encodedHeader: string,
  encodedPayload: string,
  encodedSignature: string,
  payload: Record<string, unknown>,
  clientId: string,
  alg: TelegramJwtAlg,
  jwk: JwkKey
): Record<string, unknown> {
  const signed = `${encodedHeader}.${encodedPayload}`;
  const signature = Buffer.from(encodedSignature, 'base64url');
  const publicKey = publicKeyFromJwk(jwk, alg);

  let valid = false;
  if (alg === 'RS256') {
    const verifier = createVerify('RSA-SHA256');
    verifier.update(signed);
    verifier.end();
    valid = verifier.verify(publicKey, signature);
  } else if (alg === 'ES256' || alg === 'ES256K') {
    // JWT ECDSA = raw r||s (ieee-p1363), не ASN.1 DER.
    const verifier = createVerify('SHA256');
    verifier.update(signed);
    verifier.end();
    valid = verifier.verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, signature);
  } else {
    valid = cryptoVerify(null, Buffer.from(signed), publicKey, signature);
  }

  if (!valid) {
    throw new Error('INVALID_ID_TOKEN_SIGNATURE');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== ISSUER) {
    throw new Error('INVALID_ID_TOKEN_ISSUER');
  }

  const aud = payload.aud;
  const audOk =
    aud === clientId ||
    aud === Number(clientId) ||
    String(aud) === clientId ||
    (Array.isArray(aud) && aud.some((value) => value === clientId || String(value) === clientId));
  if (!audOk) {
    throw new Error('INVALID_ID_TOKEN_AUDIENCE');
  }

  if (typeof payload.exp !== 'number' || payload.exp < now) {
    throw new Error('ID_TOKEN_EXPIRED');
  }

  return payload;
}

async function postTokenRequest(
  body: URLSearchParams,
  headers: Record<string, string>
): Promise<{ ok: boolean; status: number; json: { id_token?: string; error?: string; error_description?: string } | null }> {
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      ...headers,
    },
    body,
  });

  const json = (await tokenRes.json().catch(() => null)) as
    | { id_token?: string; error?: string; error_description?: string }
    | null;

  return { ok: tokenRes.ok, status: tokenRes.status, json };
}

export async function exchangeCodeForClaims(
  code: string,
  requestUrl: string,
  codeVerifier: string
): Promise<TelegramOidcClaims> {
  const clientId = getTelegramClientId();
  const clientSecret = getTelegramClientSecret();
  const redirectUri = buildRedirectUri(requestUrl);

  const baseParams = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  };

  // Telegram принимает и client_secret_basic, и client_secret_post.
  let result = await postTokenRequest(new URLSearchParams(baseParams), {
    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
  });

  if ((!result.ok || !result.json?.id_token) && result.json?.error === 'invalid_client') {
    result = await postTokenRequest(
      new URLSearchParams({ ...baseParams, client_secret: clientSecret }),
      {}
    );
  }

  if (!result.ok || !result.json?.id_token) {
    const details = result.json?.error_description ?? result.json?.error ?? `HTTP ${result.status}`;
    console.error('Telegram token exchange failed', {
      status: result.status,
      error: result.json?.error,
      error_description: result.json?.error_description,
      redirect_uri: redirectUri,
      client_id: clientId,
    });
    throw new Error(`TOKEN_EXCHANGE_FAILED:${details}`);
  }

  const payload = await verifyTelegramIdToken(result.json.id_token, clientId);

  // Telegram Bot-API user id — claim `id` (profile). OIDC `sub` — другой opaque id.
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
