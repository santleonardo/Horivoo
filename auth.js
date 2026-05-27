/**
 * auth.js — Autenticação via Supabase Auth REST API
 * Signup, signin, signout, gerenciamento de sessão
 */

import { SUPABASE_URL as CFG_URL, SUPABASE_KEY as CFG_KEY } from './config.js';

const BASE_URL  = (window.__SB_URL || CFG_URL) + '/auth/v1';
const API_KEY   = window.__SB_KEY || CFG_KEY;

const AUTH_KEY = 'horivoo_session';

// ================================================================
// HELPERS
// ================================================================

async function authReq(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': API_KEY,
  };

  // Se já tem sessão, incluir o token de acesso
  const session = getSession();
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
// SIGN UP — Criar conta de professor
// ================================================================

/**
 * Cria uma nova conta de professor
 * @param {string} email
 * @param {string} password - mínimo 6 caracteres
 * @param {string} name - nome do professor
 * @returns {object} user + session
 */
export async function signUp(email, password, name) {
  const data = await authReq('/signup', {
    method: 'POST',
    noAuth: true,
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      data: { name: name.trim() }  // metadata que o trigger usa
    })
  });

  // Se retornou sessão (email confirmation desativado), salvar
  if (data.session) {
    saveSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: data.user
    });
  }

  return data;
}

// ================================================================
// SIGN IN — Login de professor
// ================================================================

/**
 * Faz login com email e senha
 * @param {string} email
 * @param {string} password
 * @returns {object} session
 */
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
    saveSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      user: data.user
    });
  }

  return data;
}

// ================================================================
// SIGN OUT — Logout
// ================================================================

export async function signOut() {
  try {
    await authReq('/logout', { method: 'POST' });
  } catch {
    // Ignora erro de logout (token pode estar expirado)
  }
  clearSession();
}

// ================================================================
// FORGOT PASSWORD — Recuperar senha
// ================================================================

/**
 * Envia e-mail de recuperação de senha
 * @param {string} email
 */
export async function forgotPassword(email) {
  await authReq('/recover', {
    method: 'POST',
    noAuth: true,
    body: JSON.stringify({
      email: email.trim().toLowerCase()
    })
  });
}

// ================================================================
// SESSION — Gerenciamento de sessão
// ================================================================

/**
 * Salva sessão no localStorage
 */
export function saveSession(session) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

/**
 * Recupera sessão do localStorage
 * @returns {object|null}
 */
export function getSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);

    // Verificar se o token expirou
    if (session.expires_at && Date.now() / 1000 > session.expires_at) {
      // Token expirado — tentar refresh
      return null; // Por simplicidade, forçar novo login
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Remove sessão
 */
export function clearSession() {
  localStorage.removeItem(AUTH_KEY);
}

/**
 * Verifica se há uma sessão ativa
 */
export function isLoggedIn() {
  return getSession() !== null;
}

/**
 * Retorna o usuário logado
 */
export function getUser() {
  const session = getSession();
  return session?.user || null;
}

/**
 * Retorna o access_token do usuário logado (ou null)
 */
export function getAccessToken() {
  const session = getSession();
  return session?.access_token || null;
}

/**
 * Retorna o user_id (auth.uid) do usuário logado
 */
export function getUserId() {
  const user = getUser();
  return user?.id || null;
}
