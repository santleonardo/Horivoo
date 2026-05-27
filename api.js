/**
 * api.js — Serviço de comunicação com o Supabase
 * Suporta chamadas autenticadas (professor/coordenador) e anônimas (aluno)
 */

import { SUPABASE_URL as CFG_URL, SUPABASE_KEY as CFG_KEY } from './config.js';
import { getAccessToken } from './auth.js';

const SUPABASE_URL = window.__SB_URL || CFG_URL;
const SUPABASE_KEY = window.__SB_KEY || CFG_KEY;

// Helper de fetch com tratamento de erros
async function req(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;

  const token = getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Prefer': 'return=representation'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  }

  const res = await fetch(url, { headers, ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Erro HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ================================================================
// PROFESSORES
// ================================================================

/** Retorna todos os professores */
export async function getTeachers() {
  return req('teachers?select=id,name,email&order=name');
}

/** Busca professor pelo user_id (auth.uid) do Supabase Auth */
export async function getTeacherByUserId(userId) {
  const result = await req(`teachers?user_id=eq.${userId}&select=id,name,email,user_id`);
  return result.length > 0 ? result[0] : null;
}

/** Cria perfil de professor vinculado ao auth user */
export async function createTeacherProfile(userId, name, email) {
  const result = await req('teachers', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, name, email })
  });
  return Array.isArray(result) ? result[0] : result;
}

// ================================================================
// HORÁRIOS BLOQUEADOS (pelo professor / coordenador)
// ================================================================

/** Retorna todos os horários bloqueados de um professor */
export async function getBlockedSlots(teacherId) {
  return req(`blocked_slots?teacher_id=eq.${teacherId}&select=id,day,hour,teacher_id`);
}

/** Retorna todos os horários bloqueados (todos os professores) */
export async function getAllBlockedSlots() {
  return req('blocked_slots?select=id,day,hour,teacher_id&order=day,hour');
}

/** Bloqueia um horário */
export async function blockSlot(teacherId, day, hour) {
  return req('blocked_slots', {
    method: 'POST',
    body: JSON.stringify({ teacher_id: teacherId, day, hour })
  });
}

/** Desbloqueia um horário */
export async function unblockSlot(slotId) {
  return req(`blocked_slots?id=eq.${slotId}`, { method: 'DELETE' });
}

// ================================================================
// AGENDAMENTOS (feitos pelos alunos / coordenador)
// ================================================================

/** Retorna todos os agendamentos de um professor */
export async function getBookings(teacherId) {
  return req(`bookings?teacher_id=eq.${teacherId}&select=id,day,hour,student_name,student_email,created_at,teacher_id&order=day,hour`);
}

/** Retorna todos os agendamentos (todos os professores) */
export async function getAllBookings() {
  return req('bookings?select=id,day,hour,student_name,student_email,created_at,teacher_id&order=day,hour');
}

/** Cria um agendamento */
export async function createBooking(data) {
  return req('bookings', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/** Atualiza um agendamento */
export async function updateBooking(bookingId, data) {
  return req(`bookings?id=eq.${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

/** Cancela um agendamento */
export async function cancelBooking(bookingId) {
  return req(`bookings?id=eq.${bookingId}`, { method: 'DELETE' });
}

// ================================================================
// COORDENADORES
// ================================================================

/** Busca coordenador pelo user_id (auth.uid) */
export async function getCoordinatorByUserId(userId) {
  const result = await req(`coordinators?user_id=eq.${userId}&select=id,name,email,user_id`);
  return result.length > 0 ? result[0] : null;
}

// ================================================================
// REALTIME
// ================================================================

export function subscribeTable(table, callback) {
  const wsUrl = SUPABASE_URL
    .replace('https://', 'wss://')
    .replace('http://', 'ws://');

  const ws = new WebSocket(`${wsUrl}/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      topic: `realtime:public:${table}`,
      event: 'phx_join',
      payload: {},
      ref: '1'
    }));
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.event === 'INSERT' || msg.event === 'UPDATE' || msg.event === 'DELETE') {
      callback(msg.event, msg.payload?.record);
    }
  };

  ws.onerror = () => {
    console.warn(`[Realtime] Erro na conexão com ${table}.`);
  };

  return () => ws.close();
}
