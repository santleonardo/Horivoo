/**
 * auth.ts — Autenticação com JWT (jose) e hash seguro
 * Hashing: PBKDF2-SHA256 com salt aleatório (substituição do SHA-256 com salt fixo)
 * Compatibilidade retroativa: senhas antigas com SHA-256 ainda são verificadas
 */
import { SignJWT, jwtVerify } from 'jose';
import { randomBytes, pbkdf2Sync, createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const PBKDF2_ITERATIONS = 310_000;
const PBKDF2_KEYLEN     = 32;
const PBKDF2_DIGEST     = 'sha256';

/** Retorna o segredo JWT. Lança erro se não configurado — sem fallback inseguro. */
const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      '[auth] JWT_SECRET não definido. ' +
      'Defina-o em .env.local (mínimo 32 caracteres aleatórios).'
    );
  }
  return new TextEncoder().encode(secret);
};

/**
 * Hash seguro com PBKDF2 + salt aleatório.
 * Formato armazenado: "pbkdf2:<iter>:<salt_hex>:<hash_hex>"
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString('hex');
  return `pbkdf2:${PBKDF2_ITERATIONS}:${salt}:${hash}`;
}

/**
 * Verifica senha contra hash armazenado.
 * Suporta o novo formato PBKDF2 e o legado SHA-256 para migração transparente.
 */
export function verifyPassword(password: string, stored: string): boolean {
  if (stored.startsWith('pbkdf2:')) {
    const parts = stored.split(':');
    if (parts.length !== 4) return false;
    const [, iter, salt, expectedHex] = parts;
    const derived   = pbkdf2Sync(password, salt, parseInt(iter, 10), PBKDF2_KEYLEN, PBKDF2_DIGEST);
    const expected  = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  }

  // Fallback legado: SHA-256 com salt fixo (será migrado no próximo login)
  const legacy = createHash('sha256').update(`horivoo:${password}`).digest('hex');
  const legacyBuf = Buffer.from(legacy, 'hex');
  const storedBuf = Buffer.from(stored, 'hex');
  if (legacyBuf.length !== storedBuf.length) return false;
  return timingSafeEqual(legacyBuf, storedBuf);
}

export async function createToken(payload: {
  userId: string;
  email: string;
  role: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyToken(
  token: string
): Promise<{ userId: string; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function getUserFromRequest(
  request: NextRequest
): Promise<{ userId: string; email: string; role: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return verifyToken(token);
}

export async function requireRole(
  request: NextRequest,
  ...roles: string[]
): Promise<{ userId: string; email: string; role: string } | NextResponse> {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!roles.includes(user.role))
    return NextResponse.json({ error: 'Acesso proibido' }, { status: 403 });
  return user;
}
