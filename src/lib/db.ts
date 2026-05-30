/**
 * db.ts — Cliente Supabase (PostgREST)
 * Tabelas: users, teachers, coordinators, students, available_slots,
 *          blocked_slots, bookings, recurring_bookings, non_class_days,
 *          holidays, recesses, blocked_periods, messages,
 *          classes, class_students, appointments, tests, attendance, make_up_classes
 */

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isConfigured = !!(SUPABASE_URL && SUPABASE_KEY);

if (!isConfigured) {
  console.error(
    '[db] Variáveis de ambiente do Supabase NÃO configuradas!\n' +
    '    NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.\n' +
    '    Copie .env.example para .env.local e preencha com suas credenciais.'
  );
}

/** Verifica se o Supabase está configurado */
export function isSupabaseConfigured(): boolean {
  return isConfigured;
}

type Row = Record<string, unknown>;
type OrderDir = 'asc' | 'desc';

// ---------------------------------------------------------------------------
// snake_case → camelCase conversion
// Supabase / PostgREST returns column names as-is (snake_case). All route and
// component code was written expecting camelCase keys (dayOfWeek, startTime …).
// These helpers bridge the gap so we don't have to rename every accessor.
// ---------------------------------------------------------------------------
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function toCamel<T>(obj: T): T {
  if (Array.isArray(obj)) return (obj as unknown[]).map(toCamel) as unknown as T;
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        snakeToCamel(k),
        toCamel(v),
      ])
    ) as T;
  }
  return obj;
}

interface FindManyOptions {
  where?: Row;
  orderBy?: { [field: string]: OrderDir } | Array<{ [field: string]: OrderDir }>;
  include?: Record<string, boolean>;
  take?: number;
  select?: string[];
}

async function sbFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!isConfigured) {
    throw new Error(
      'Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local'
    );
  }

  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string; hint?: string; details?: string; code?: string };
    const msg = err.message || err.details || err.hint || `Supabase error ${res.status}`;
    console.error(`[db] ${options.method || 'GET'} ${url} → ${res.status}:`, msg);
    throw new Error(msg);
  }

  const text = await res.text();
  if (!text || text === 'null') return [] as unknown as T;
  return JSON.parse(text) as T;
}

function buildQuery(table: string, opts: FindManyOptions = {}): string {
  const params: string[] = [];

  const selectFields = opts.select?.join(',') || '*';
  params.push(`select=${selectFields}`);

  if (opts.where) {
    for (const [key, val] of Object.entries(opts.where)) {
      if (val === null || val === undefined) continue;
      if (typeof val === 'object' && !Array.isArray(val)) {
        const op = val as Record<string, unknown>;
        if (op.in)         params.push(`${key}=in.(${(op.in as unknown[]).join(',')})`);
        if (op.gte)        params.push(`${key}=gte.${op.gte}`);
        if (op.lte)        params.push(`${key}=lte.${op.lte}`);
        if (op.gt)         params.push(`${key}=gt.${op.gt}`);
        if (op.lt)         params.push(`${key}=lt.${op.lt}`);
        if (op.startsWith) params.push(`${key}=like.${op.startsWith}*`);
        if (op.contains)   params.push(`${key}=ilike.*${op.contains}*`);
      } else {
        params.push(`${key}=eq.${val}`);
      }
    }
  }

  if (opts.orderBy) {
    const orders = Array.isArray(opts.orderBy) ? opts.orderBy : [opts.orderBy];
    const orderStr = orders.map(o => {
      const [field, dir] = Object.entries(o)[0];
      return `${field}.${dir}`;
    }).join(',');
    params.push(`order=${orderStr}`);
  }

  if (opts.take) params.push(`limit=${opts.take}`);

  return `${table}?${params.join('&')}`;
}

function makeTable<T extends Row>(table: string) {
  return {
    async findMany(opts: FindManyOptions = {}): Promise<T[]> {
      const rows = await sbFetch<T[]>(buildQuery(table, opts));
      return toCamel(rows);
    },

    async findUnique(opts: { where: Row }): Promise<T | null> {
      const rows = await sbFetch<T[]>(buildQuery(table, { where: opts.where, take: 1 }));
      return toCamel(rows[0] ?? null);
    },

    async findFirst(opts: { where: Row }): Promise<T | null> {
      const rows = await sbFetch<T[]>(buildQuery(table, { where: opts.where, take: 1 }));
      return toCamel(rows[0] ?? null);
    },

    async create(opts: { data: Row }): Promise<T> {
      const rows = await sbFetch<T[]>(`${table}?select=*`, {
        method: 'POST',
        body: JSON.stringify(opts.data),
      });
      if (!rows[0]) throw new Error(`[db] create(${table}) sem retorno — verifique RLS e constraints`);
      return toCamel(rows[0]);
    },

    async update(opts: { where: Row; data: Row }): Promise<T> {
      const params = Object.entries(opts.where)
        .map(([k, v]) => `${k}=eq.${v}`)
        .join('&');
      const rows = await sbFetch<T[]>(`${table}?${params}&select=*`, {
        method: 'PATCH',
        body: JSON.stringify(opts.data),
      });
      return toCamel(rows[0]);
    },

    async delete(opts: { where: Row }): Promise<void> {
      const params = Object.entries(opts.where)
        .map(([k, v]) => `${k}=eq.${v}`)
        .join('&');
      await sbFetch(`${table}?${params}`, { method: 'DELETE' });
    },

    async count(opts: { where?: Row } = {}): Promise<number> {
      const params = new URLSearchParams();
      params.set('select', 'id');
      if (opts.where) {
        for (const [k, v] of Object.entries(opts.where)) {
          if (v === null || v === undefined) continue;
          if (typeof v === 'object' && !Array.isArray(v)) {
            const op = v as Record<string, unknown>;
            if (op.in)  params.set(k, `in.(${(op.in as unknown[]).join(',')})`);
            if (op.gte) params.set(k, `gte.${op.gte}`);
          } else {
            params.set(k, `eq.${v}`);
          }
        }
      }
      const url = `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'count=exact',
          'Range': '0-0',
        },
      });
      const range = res.headers.get('Content-Range') || '0/0';
      return parseInt(range.split('/')[1] || '0', 10);
    },
  };
}

export const db = {
  user:             makeTable('users'),
  teacher:          makeTable('teachers'),
  coordinator:      makeTable('coordinators'),
  student:          makeTable('students'),
  availableSlot:    makeTable('available_slots'),
  blockedSlot:      makeTable('blocked_slots'),
  booking:          makeTable('bookings'),
  recurringBooking: makeTable('recurring_bookings'),
  nonClassDay:      makeTable('non_class_days'),
  holiday:          makeTable('holidays'),
  recess:           makeTable('recesses'),
  blockedPeriod:    makeTable('blocked_periods'),
  message:          makeTable('messages'),
  /** Turmas (classes) */
  class_:           makeTable('classes'),
  /** Relação turma ↔ aluno */
  classStudent:     makeTable('class_students'),
  /** Agendamentos / Appointments */
  appointment:      makeTable('appointments'),
  /** Provas */
  test:             makeTable('tests'),
  /** Presença / Frequência */
  attendance:       makeTable('attendance'),
  /** Reposições de aula */
  makeUpClass:      makeTable('make_up_classes'),
};
