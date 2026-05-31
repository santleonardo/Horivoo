/**
 * auth.ts — Autenticação com JWT (jose) e hash nativo
 * Sem bcryptjs — usa crypto nativo do Node.js (disponível no Vercel Edge)
 */
import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

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

/**
 * Extrai o usuário autenticado de uma NextRequest.
 * Verifica o header Authorization: Bearer <token>
 * Retorna o payload decodificado ou null se inválido/ausente.
 */
export async function getUserFromRequest(
  request: NextRequest
): Promise<{ userId: string; email: string; role: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return verifyToken(token);
}

/**
 * Require that the authenticated user has one of the specified roles.
 * Returns the user object if authorized, or a NextResponse with 401/403.
 */
export async function requireRole(
  request: NextRequest,
  ...roles: string[]
): Promise<{ userId: string; email: string; role: string } | NextResponse> {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!roles.includes(user.role)) return NextResponse.json({ error: 'Acesso proibido' }, { status: 403 });
  return user;
}
