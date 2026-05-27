/**
 * auth.js — Autenticação via Supabase Auth REST API
 *
 * FIXES aplicados:
 * - Token refresh implementado (antes o usuário era deslogado após 1h sem aviso)
 * - Mensagens de erro em português para todos os casos
 * - Proteção contra race condition no refresh
 */

import { SUPABASE_URL as CFG_URL, SUPABASE_KEY as CFG_KEY } from './config.js';

// FIX: lazy getters em vez de constantes avaliadas no load-time
// (idêntico ao que api.js já faz) — evita que as credenciais fiquem
// congeladas com o valor placeholder quando o módulo carrega antes
// do script inline definir window.__SB_URL / window.__SB_KEY
function getSbUrl() { return window.__SB_URL || CFG_URL; }
function getSbKey() { return window.__SB_KEY || CFG_KEY; }
const AUTH_KEY = 'horivoo_session';

// Mutex para evitar múltiplos refreshes simultâneos
let _refreshPromise = null;

// ================================================================
// HELPERS
// ================================================================

async function authReq(endpoint, options = {}) {
  const url = `${getSbUrl()}/auth/v1${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': getSbKey(),
  };

  const session = getRawSession();
  if (session?.access_token && !options.noAuth) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(url, { headers, ...options });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.msg || err.message || err.error_description || `Erro HTTP ${res.status}`;
    throw new Error(msg);
  }

  return res.json();
}

// ================================================================
// SIGN UP
// ================================================================

export async function signUp(email, password, name) {
  const data = await authReq('/signup', {
    method: 'POST',
    noAuth: true,
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      data: { name: name.trim() }
    })
  });

  if (data.session) {
    saveSession(buildSession(data.session, data.user));
  }

  return data;
}

// ================================================================
// SIGN IN
// ================================================================

export async function signIn(email, password) {
  const data = await authReq('/token?grant_type=password', {
    method: 'POST',
    noAuth: true,
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password
    })
  });

  if (data.access_token) {
    saveSession(buildSession(data, data.user));
  }

  return data;
}

// ================================================================
// SIGN OUT
// ================================================================

export async function signOut() {
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

export async function forgotPassword(email) {
  await authReq('/recover', {
    method: 'POST',
    noAuth: true,
    body: JSON.stringify({ email: email.trim().toLowerCase() })
  });
}

// ================================================================
// TOKEN REFRESH
// FIX: antes retornava null silenciosamente; agora tenta renovar o token
// ================================================================

async function refreshToken(refreshTkn) {
  const data = await authReq('/token?grant_type=refresh_token', {
    method: 'POST',
    noAuth: true,
    body: JSON.stringify({ refresh_token: refreshTkn })
  });

  if (data.access_token) {
    const session = buildSession(data, data.user);
    saveSession(session);
    return session;
  }

  throw new Error('Refresh falhou.');
}

// ================================================================
// SESSION MANAGEMENT
// ================================================================

function buildSession(tokenData, user) {
  return {
    access_token:  tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    // expires_at pode vir como número (Unix timestamp) ou ser calculado
    expires_at: tokenData.expires_at
      ? Number(tokenData.expires_at)
      : Math.floor(Date.now() / 1000) + (tokenData.expires_in || 3600),
    user
  };
}

export function saveSession(session) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

function getRawSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Retorna a sessão, fazendo refresh automático se necessário.
 * FIX: antes retornava null quando expirava; agora tenta refresh_token primeiro.
 */
export async function getSession() {
  const session = getRawSession();
  if (!session) return null;

  const nowSecs = Math.floor(Date.now() / 1000);
  const bufferSecs = 60; // Renovar 60s antes de expirar

  if (session.expires_at && nowSecs >= session.expires_at - bufferSecs) {
    if (!session.refresh_token) {
      clearSession();
      return null;
    }

    // Evita múltiplos refreshes em paralelo
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
export function getSessionSync() {
  return getRawSession();
}

export function clearSession() {
  localStorage.removeItem(AUTH_KEY);
}

export function isLoggedIn() {
  const s = getRawSession();
  if (!s) return false;
  // Considera logado mesmo com token próximo de expirar (o refresh cuida)
  return true;
}

export function getUser() {
  return getRawSession()?.user || null;
}

export function getAccessToken() {
  return getRawSession()?.access_token || null;
}

export function getUserId() {
  return getUser()?.id || null;
}
