/**
 * auth.ts — Autenticação via Supabase Auth REST API
 *
 * FIXES aplicados:
 * - Token refresh implementado (antes o usuário era deslogado após 1h sem aviso)
 * - Mensagens de erro em português para todos os casos
 * - Proteção contra race condition no refresh
 */

import { SUPABASE_URL as CFG_URL, SUPABASE_KEY as CFG_KEY } from './config.js';
import type { Session, AuthUser, SignUpResponse, SignInResponse } from './types.js';

const BASE_URL: string = (window.__SB_URL || CFG_URL) + '/auth/v1';
const API_KEY: string  = window.__SB_KEY || CFG_KEY;
const AUTH_KEY: string = 'horivoo_session';

// Mutex para evitar múltiplos refreshes simultâneos
let _refreshPromise: Promise<Session | null> | null = null;

// ================================================================
// HELPERS
// ================================================================

interface AuthReqOptions extends RequestInit {
  noAuth?: boolean;
}

async function authReq<T = unknown>(endpoint: string, options: AuthReqOptions = {}): Promise<T> {
  const { noAuth, ...fetchOptions } = options;
  const url: string = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': API_KEY,
  };

  const session: Session | null = getRawSession();
  if (session?.access_token && !noAuth) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const res: Response = await fetch(url, { headers, ...fetchOptions });

  if (!res.ok) {
    const err: Record<string, unknown> = await res.json().catch(() => ({}));
    const msg: string =
      (err.msg as string) ||
      (err.message as string) ||
      (err.error_description as string) ||
      `Erro HTTP ${res.status}`;
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

// ================================================================
// SIGN UP
// ================================================================

export async function signUp(email: string, password: string, name: string): Promise<SignUpResponse> {
  const data: SignUpResponse = await authReq<SignUpResponse>('/signup', {
    method: 'POST',
    noAuth: true,
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      data: { name: name.trim() }
    })
  });

  if (data.session) {
    saveSession(buildSession(data as unknown as SignInResponse, data.user as AuthUser));
  }

  return data;
}

// ================================================================
// SIGN IN
// ================================================================

export async function signIn(email: string, password: string): Promise<SignInResponse> {
  const data: SignInResponse = await authReq<SignInResponse>('/token?grant_type=password', {
    method: 'POST',
    noAuth: true,
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password
    })
  });

  if (data.access_token) {
    saveSession(buildSession(data, data.user as AuthUser));
  }

  return data;
}

// ================================================================
// SIGN OUT
// ================================================================

export async function signOut(): Promise<void> {
  try {
    await authReq('/logout', { method: 'POST' });
  } catch {
    // Token pode estar expirado — ignora e limpa local mesmo assim
  }
  clearSession();
}

// ================================================================
// FORGOT PASSWORD
// ================================================================

export async function forgotPassword(email: string): Promise<void> {
  await authReq('/recover', {
    method: 'POST',
    noAuth: true,
    body: JSON.stringify({ email: email.trim().toLowerCase() })
  });
}

// ================================================================
// TOKEN REFRESH
// ================================================================

async function refreshToken(refreshTkn: string): Promise<Session> {
  const data: SignInResponse = await authReq<SignInResponse>('/token?grant_type=refresh_token', {
    method: 'POST',
    noAuth: true,
    body: JSON.stringify({ refresh_token: refreshTkn })
  });

  if (data.access_token) {
    const session: Session = buildSession(data, data.user as AuthUser);
    saveSession(session);
    return session;
  }

  throw new Error('Refresh falhou.');
}

// ================================================================
// SESSION MANAGEMENT
// ================================================================

function buildSession(tokenData: SignInResponse, user?: AuthUser): Session {
  return {
    access_token:  tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: tokenData.expires_at
      ? Number(tokenData.expires_at)
      : Math.floor(Date.now() / 1000) + (tokenData.expires_in || 3600),
    user: user || ({} as AuthUser)
  };
}

export function saveSession(session: Session): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

function getRawSession(): Session | null {
  try {
    const raw: string | null = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) as Session : null;
  } catch {
    return null;
  }
}

/**
 * Retorna a sessão, fazendo refresh automático se necessário.
 */
export async function getSession(): Promise<Session | null> {
  const session: Session | null = getRawSession();
  if (!session) return null;

  const nowSecs: number = Math.floor(Date.now() / 1000);
  const bufferSecs: number = 60;

  if (session.expires_at && nowSecs >= session.expires_at - bufferSecs) {
    if (!session.refresh_token) {
      clearSession();
      return null;
    }

    if (!_refreshPromise) {
      _refreshPromise = refreshToken(session.refresh_token)
        .catch(() => { clearSession(); return null; })
        .finally(() => { _refreshPromise = null; });
    }

    return _refreshPromise;
  }

  return session;
}

/** Versão síncrona para acesso rápido (não faz refresh) */
export function getSessionSync(): Session | null {
  return getRawSession();
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function isLoggedIn(): boolean {
  const s: Session | null = getRawSession();
  if (!s) return false;
  return true;
}

export function getUser(): AuthUser | null {
  return getRawSession()?.user || null;
}

export function getAccessToken(): string | null {
  return getRawSession()?.access_token || null;
}

export function getUserId(): string | null {
  return getUser()?.id || null;
}
