/**
 * api.js — Serviço de comunicação com o Supabase
 * Suporta chamadas autenticadas (professor) e anônimas (aluno)
 */

import { SUPABASE_URL as CFG_URL, SUPABASE_KEY as CFG_KEY } from './config.js';
import { getAccessToken } from './auth.js';

const SUPABASE_URL = window.__SB_URL || CFG_URL;
const SUPABASE_KEY = window.__SB_KEY || CFG_KEY;

// Helper de fetch com tratamento de erros
// Usa token de autenticação quando disponível (professor logado)
async function req(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;

  const token = getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Prefer': 'return=representation'
  };

  if (token) {
    // Professor logado: usa access_token pessoal
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Aluno / anônimo: usa anon key
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

// ================================================================
// HORÁRIOS BLOQUEADOS (pelo professor)
// ================================================================

/**
 * Retorna todos os horários bloqueados de um professor
 * @param {string} teacherId
 */
export async function getBlockedSlots(teacherId) {
  return req(`blocked_slots?teacher_id=eq.${teacherId}&select=id,day,hour`);
}

/**
 * Bloqueia um horário
 * @param {string} teacherId
 * @param {string} day - ex: 'segunda'
 * @param {string} hour - ex: '08:00'
 */
export async function blockSlot(teacherId, day, hour) {
  return req('blocked_slots', {
    method: 'POST',
    body: JSON.stringify({ teacher_id: teacherId, day, hour })
  });
}

/**
 * Desbloqueia um horário
 * @param {string} slotId - id do registro em blocked_slots
 */
export async function unblockSlot(slotId) {
  return req(`blocked_slots?id=eq.${slotId}`, { method: 'DELETE' });
}

// ================================================================
// AGENDAMENTOS (feitos pelos alunos)
// ================================================================

/**
 * Retorna todos os agendamentos de um professor
 * @param {string} teacherId
 */
export async function getBookings(teacherId) {
  return req(`bookings?teacher_id=eq.${teacherId}&select=id,day,hour,student_name,student_email,created_at&order=day,hour`);
}

/**
 * Cria um agendamento
 * @param {object} data - { teacher_id, student_name, student_email, day, hour }
 */
export async function createBooking(data) {
  return req('bookings', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Cancela um agendamento
 * @param {string} bookingId
 */
export async function cancelBooking(bookingId) {
  return req(`bookings?id=eq.${bookingId}`, { method: 'DELETE' });
}

// ================================================================
// REALTIME — escuta mudanças via Server-Sent Events (Supabase)
// ================================================================

/**
 * Assina mudanças em tempo real numa tabela.
 * Retorna uma função para cancelar a assinatura.
 *
 * @param {string} table - 'blocked_slots' | 'bookings'
 * @param {function} callback - chamado a cada mudança
 */
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
    console.warn(`[Realtime] Erro na conexão com ${table}. Usando polling.`);
  };

  return () => ws.close();
}
