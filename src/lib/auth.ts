/**
 * auth.ts — Autenticação com JWT (jose) e hash nativo
 * Sem bcryptjs — usa crypto nativo do Node.js (disponível no Vercel Edge)
 */
import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';

const getSecret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET || 'horivoo-mude-isso-em-producao-2025'
  );

/** Hash simples com SHA-256 + salt fixo (MVP) */
export function hashPassword(password: string): string {
  return createHash('sha256')
    .update(`horivoo:${password}`)
    .digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
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
