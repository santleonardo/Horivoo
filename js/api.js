/**
 * api.js — Serviço de comunicação com o Supabase
 *
 * FIX: credenciais agora são lidas via getter lazy (função), evitando
 * o problema de modules ES serem avaliados antes do override ser definido.
 */

import { SUPABASE_URL as CFG_URL, SUPABASE_KEY as CFG_KEY } from './config.js';
import { getAccessToken } from './auth.js';

// FIX: lazy getters em vez de constantes avaliadas no load-time
function getSbUrl() { return window.__SB_URL || CFG_URL; }
function getSbKey() { return window.__SB_KEY || CFG_KEY; }

// ================================================================
// HELPER DE FETCH
// ================================================================

async function req(path, options = {}) {
  const url     = `${getSbUrl()}/rest/v1/${path}`;
  const token   = getAccessToken();
  const sbKey   = getSbKey();

  const headers = {
    'Content-Type': 'application/json',
    'apikey': sbKey,
    'Prefer': 'return=representation',
    'Authorization': token ? `Bearer ${token}` : `Bearer ${sbKey}`
  };

  const res = await fetch(url, { headers, ...options });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Erro HTTP ${res.status}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ================================================================
// PROFESSORES
// ================================================================

export async function getTeachers() {
  return req('teachers?select=id,name,email&order=name');
}

export async function getTeacherByUserId(userId) {
  const result = await req(`teachers?user_id=eq.${userId}&select=id,name,email,user_id`);
  return result.length > 0 ? result[0] : null;
}

export async function createTeacherProfile(userId, name, email) {
  const result = await req('teachers', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, name, email })
  });
  return Array.isArray(result) ? result[0] : result;
}

export async function updateTeacher(id, data) {
  return req(`teachers?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteTeacher(id) {
  return req(`teachers?id=eq.${id}`, { method: 'DELETE' });
}

// ================================================================
// HORÁRIOS BLOQUEADOS
// ================================================================

export async function getBlockedSlots(teacherId) {
  return req(`blocked_slots?teacher_id=eq.${teacherId}&select=id,day,hour,teacher_id`);
}

export async function getAllBlockedSlots() {
  return req('blocked_slots?select=id,day,hour,teacher_id&order=day,hour');
}

export async function blockSlot(teacherId, day, hour) {
  return req('blocked_slots', {
    method: 'POST',
    body: JSON.stringify({ teacher_id: teacherId, day, hour })
  });
}

export async function unblockSlot(slotId) {
  return req(`blocked_slots?id=eq.${slotId}`, { method: 'DELETE' });
}

// ================================================================
// AGENDAMENTOS
// ================================================================

export async function getBookings(teacherId) {
  return req(`bookings?teacher_id=eq.${teacherId}&select=id,day,hour,student_name,student_email,created_at,teacher_id&order=day,hour`);
}

export async function getAllBookings() {
  return req('bookings?select=id,day,hour,student_name,student_email,created_at,teacher_id&order=day,hour');
}

export async function createBooking(data) {
  return req('bookings', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateBooking(bookingId, data) {
  return req(`bookings?id=eq.${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function cancelBooking(bookingId) {
  return req(`bookings?id=eq.${bookingId}`, { method: 'DELETE' });
}

// ================================================================
// COORDENADORES
// ================================================================

export async function getCoordinatorByUserId(userId) {
  const result = await req(`coordinators?user_id=eq.${userId}&select=id,name,email,user_id`);
  return result.length > 0 ? result[0] : null;
}

// ================================================================
// REALTIME
// ================================================================

export function subscribeTable(table, callback) {
  const wsUrl = getSbUrl()
    .replace('https://', 'wss://')
    .replace('http://', 'ws://');

  let ws;
  let reconnectTimer;

  function connect() {
    ws = new WebSocket(`${wsUrl}/realtime/v1/websocket?apikey=${getSbKey()}&vsn=1.0.0`);

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
      if (['INSERT', 'UPDATE', 'DELETE'].includes(msg.event)) {
        callback(msg.event, msg.payload?.record);
      }
    };

    ws.onerror = () => {
      console.warn(`[Realtime] Erro em ${table}. Reconectando em 5s...`);
    };

    // FIX: reconectar automaticamente se a conexão cair
    ws.onclose = (e) => {
      if (e.code !== 1000) { // 1000 = fechamento limpo (pelo cleanup)
        reconnectTimer = setTimeout(connect, 5000);
      }
    };
  }

  connect();

  // Retorna função de cleanup
  return () => {
    clearTimeout(reconnectTimer);
    ws?.close(1000);
  };
}
