/**
 * api.ts — Serviço de comunicação com o Supabase
 *
 * FIX: credenciais agora são lidas via getter lazy (função), evitando
 * o problema de modules ES serem avaliados antes do override ser definido.
 */

import { SUPABASE_URL as CFG_URL, SUPABASE_KEY as CFG_KEY } from './config.js';
import { getAccessToken } from './auth.js';
import type {
  Teacher,
  BlockedSlot,
  Booking,
  Coordinator,
  CreateBookingData,
  CreateTeacherData,
  UpdateTeacherData,
  RealtimeCallback,
  UnsubscribeFn,
  RealtimeEvent
} from './types.js';

// FIX: lazy getters em vez de constantes avaliadas no load-time
function getSbUrl(): string { return window.__SB_URL || CFG_URL; }
function getSbKey(): string { return window.__SB_KEY || CFG_KEY; }

// ================================================================
// HELPER DE FETCH
// ================================================================

interface ReqOptions extends RequestInit {
  // Propriedades customizadas podem ser adicionadas aqui
}

async function req<T = unknown>(path: string, options: ReqOptions = {}): Promise<T> {
  const url: string     = `${getSbUrl()}/rest/v1/${path}`;
  const token: string | null = getAccessToken();
  const sbKey: string   = getSbKey();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': sbKey,
    'Prefer': 'return=representation',
    'Authorization': token ? `Bearer ${token}` : `Bearer ${sbKey}`
  };

  const res: Response = await fetch(url, { headers, ...options });

  if (!res.ok) {
    const err: Record<string, unknown> = await res.json().catch(() => ({}));
    throw new Error(
      (err.message as string) || (err.error as string) || `Erro HTTP ${res.status}`
    );
  }

  const text: string = await res.text();
  return text ? JSON.parse(text) as T : ([] as unknown as T);
}

// ================================================================
// PROFESSORES
// ================================================================

export async function getTeachers(): Promise<Teacher[]> {
  return req<Teacher[]>('teachers?select=id,name,email&order=name');
}

export async function getTeacherByUserId(userId: string): Promise<Teacher | null> {
  const result: Teacher[] = await req<Teacher[]>(`teachers?user_id=eq.${userId}&select=id,name,email,user_id`);
  return result.length > 0 ? result[0] : null;
}

export async function createTeacherProfile(userId: string, name: string, email: string): Promise<Teacher> {
  const result: Teacher | Teacher[] = await req<Teacher | Teacher[]>('teachers', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, name, email } as CreateTeacherData)
  });
  return Array.isArray(result) ? result[0] : result;
}

export async function updateTeacher(id: string, data: UpdateTeacherData): Promise<Teacher[]> {
  return req<Teacher[]>(`teachers?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteTeacher(id: string): Promise<unknown> {
  return req(`teachers?id=eq.${id}`, { method: 'DELETE' });
}

// ================================================================
// HORÁRIOS BLOQUEADOS
// ================================================================

export async function getBlockedSlots(teacherId: string): Promise<BlockedSlot[]> {
  return req<BlockedSlot[]>(`blocked_slots?teacher_id=eq.${teacherId}&select=id,day,hour,teacher_id`);
}

export async function getAllBlockedSlots(): Promise<BlockedSlot[]> {
  return req<BlockedSlot[]>('blocked_slots?select=id,day,hour,teacher_id&order=day,hour');
}

export async function blockSlot(teacherId: string, day: string, hour: string): Promise<BlockedSlot | BlockedSlot[]> {
  return req<BlockedSlot | BlockedSlot[]>('blocked_slots', {
    method: 'POST',
    body: JSON.stringify({ teacher_id: teacherId, day, hour })
  });
}

export async function unblockSlot(slotId: string): Promise<unknown> {
  return req(`blocked_slots?id=eq.${slotId}`, { method: 'DELETE' });
}

// ================================================================
// AGENDAMENTOS
// ================================================================

export async function getBookings(teacherId: string): Promise<Booking[]> {
  return req<Booking[]>(`bookings?teacher_id=eq.${teacherId}&select=id,day,hour,student_name,student_email,created_at,teacher_id&order=day,hour`);
}

export async function getAllBookings(): Promise<Booking[]> {
  return req<Booking[]>('bookings?select=id,day,hour,student_name,student_email,created_at,teacher_id&order=day,hour');
}

export async function createBooking(data: CreateBookingData): Promise<Booking | Booking[]> {
  return req<Booking | Booking[]>('bookings', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateBooking(bookingId: string, data: Partial<CreateBookingData>): Promise<Booking[]> {
  return req<Booking[]>(`bookings?id=eq.${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function cancelBooking(bookingId: string): Promise<unknown> {
  return req(`bookings?id=eq.${bookingId}`, { method: 'DELETE' });
}

// ================================================================
// COORDENADORES
// ================================================================

export async function getCoordinatorByUserId(userId: string): Promise<Coordinator | null> {
  const result: Coordinator[] = await req<Coordinator[]>(`coordinators?user_id=eq.${userId}&select=id,name,email,user_id`);
  return result.length > 0 ? result[0] : null;
}

// ================================================================
// REALTIME
// ================================================================

interface RealtimeMessage {
  topic?: string;
  event: string;
  payload?: {
    record?: Record<string, unknown>;
    [key: string]: unknown;
  };
  ref?: string;
}

export function subscribeTable(table: string, callback: RealtimeCallback): UnsubscribeFn {
  const wsUrl: string = getSbUrl()
    .replace('https://', 'wss://')
    .replace('http://', 'ws://');

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect(): void {
    ws = new WebSocket(`${wsUrl}/realtime/v1/websocket?apikey=${getSbKey()}&vsn=1.0.0`);

    ws.onopen = () => {
      ws!.send(JSON.stringify({
        topic: `realtime:public:${table}`,
        event: 'phx_join',
        payload: {},
        ref: '1'
      }));
    };

    ws.onmessage = (e: MessageEvent) => {
      const msg: RealtimeMessage = JSON.parse(e.data as string);
      if (['INSERT', 'UPDATE', 'DELETE'].includes(msg.event)) {
        callback(msg.event as RealtimeEvent, msg.payload?.record);
      }
    };

    ws.onerror = () => {
      console.warn(`[Realtime] Erro em ${table}. Reconectando em 5s...`);
    };

    ws.onclose = (e: CloseEvent) => {
      if (e.code !== 1000) {
        reconnectTimer = setTimeout(connect, 5000);
      }
    };
  }

  connect();

  return () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close(1000);
  };
}
