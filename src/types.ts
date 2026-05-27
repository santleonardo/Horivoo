/**
 * types.ts — Definições de tipos compartilhados da aplicação Horivoo
 */

// ================================================================
// TIPOS DE DOMÍNIO
// ================================================================

/** Representa um professor cadastrado no sistema */
export interface Teacher {
  id: string;
  name: string;
  email: string;
  user_id?: string;
  created_at?: string;
}

/** Representa um coordenador cadastrado no sistema */
export interface Coordinator {
  id: string;
  name: string;
  email: string;
  user_id?: string;
  created_at?: string;
}

/** Representa um horário bloqueado por um professor */
export interface BlockedSlot {
  id: string;
  teacher_id: string;
  day: string;
  hour: string;
  teacher_name?: string;
  created_at?: string;
}

/** Representa um agendamento feito por um aluno */
export interface Booking {
  id: string;
  teacher_id: string;
  student_name: string;
  student_email: string | null;
  day: string;
  hour: string;
  teacher_name?: string;
  created_at?: string;
}

/** Dados para criar um novo agendamento */
export interface CreateBookingData {
  teacher_id: string;
  student_name: string;
  student_email: string | null;
  day: string;
  hour: string;
}

/** Dados para criar perfil de professor */
export interface CreateTeacherData {
  user_id: string;
  name: string;
  email: string;
}

/** Dados para atualizar professor */
export interface UpdateTeacherData {
  name?: string;
  email?: string;
}

// ================================================================
// TIPOS DE SESSÃO / AUTENTICAÇÃO
// ================================================================

/** Metadados do usuário no Supabase Auth */
export interface UserMetadata {
  name?: string;
  [key: string]: unknown;
}

/** Dados do usuário retornados pelo Supabase Auth */
export interface AuthUser {
  id: string;
  email?: string;
  email_confirmed?: boolean;
  user_metadata?: UserMetadata;
  aud?: string;
  role?: string;
}

/** Sessão completa armazenada no localStorage */
export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
}

/** Dados retornados pelo endpoint de signup */
export interface SignUpResponse {
  session?: Session;
  user?: AuthUser;
  [key: string]: unknown;
}

/** Dados retornados pelo endpoint de signin */
export interface SignInResponse {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  user?: AuthUser;
  [key: string]: unknown;
}

// ================================================================
// TIPOS DE CONFIGURAÇÃO
// ================================================================

/** Período do dia (manhã, tarde, noite) */
export type PeriodKey = 'manha' | 'tarde' | 'noite';

/** Configuração de um período do dia */
export interface PeriodConfig {
  label: string;
  icon: string;
  hours: string[];
}

/** Mapa de períodos do dia */
export type ScheduleMap = Record<PeriodKey, PeriodConfig>;

/** Dia da semana */
export interface DayConfig {
  key: string;
  label: string;
  full: string;
}

// ================================================================
// TIPOS DE UI
// ================================================================

/** Tipo de notificação toast */
export type ToastType = 'success' | 'error' | 'info';

/** Status de um slot de horário */
export type SlotStatus = 'available' | 'blocked' | 'booked';

/** Informações de um slot ao clicar */
export interface SlotClickInfo {
  day: string;
  dayFull?: string;
  hour: string;
  status: SlotStatus;
  id: string | null;
  teacherId?: string | null;
  teacherName?: string | null;
}

/** Informações passadas ao modal de agendamento do aluno */
export interface BookingSlotInfo {
  day: string;
  dayFull?: string;
  hour: string;
  teacherName?: string;
}

/** Dados retornados pelo modal de agendamento do aluno */
export interface BookingConfirmData {
  studentName: string;
  studentEmail: string;
  hour: string;
}

/** Informações passadas ao modal do professor */
export interface TeacherSlotInfo {
  day: string;
  dayFull?: string;
  hour: string;
  status: SlotStatus;
  id: string | null;
}

/** Ação retornada pelo modal do professor */
export interface TeacherSlotAction {
  action: 'block' | 'unblock' | 'cancel_booking';
  hour: string;
  id: string | null;
}

/** Modo de renderização da grade semanal */
export type GridMode = 'teacher' | 'student' | 'coordinator';

/** Callbacks para a grade semanal */
export interface GridCallbacks {
  onSlotClick?: (info: SlotClickInfo) => void;
  teacherId?: string | null;
  teacherName?: string | null;
}

/** Estatísticas da semana */
export interface WeekStats {
  totalFree: number;
  totalBlocked: number;
  totalBooked: number;
}

/** Tipo de filtro do coordenador */
export type CoordFilterType = 'all' | 'hour' | 'teacher' | 'student';

/** Item da tabela do coordenador */
export interface CoordTableItem {
  type: 'blocked' | 'booked';
  teacher_id: string | null;
  teacher_name: string;
  day: string;
  hour: string;
  student_name: string;
  student_email: string;
  id: string;
}

// ================================================================
// TIPOS DE REALTIME / WEBSOCKET
// ================================================================

/** Evento recebido via WebSocket do Supabase Realtime */
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

/** Callback de evento realtime */
export type RealtimeCallback = (event: RealtimeEvent, record?: Record<string, unknown>) => void;

/** Função de cleanup de inscrição realtime */
export type UnsubscribeFn = () => void;

// ================================================================
// AUGMENTAÇÃO DO WINDOW
// ================================================================

/** Propriedades globais injetadas no window */
declare global {
  interface Window {
    __SB_URL?: string;
    __SB_KEY?: string;
    __TEACHER_ID?: string;
    __TEACHER_NAME?: string;
    __COORDINATOR_ID?: string;
    __COORDINATOR_NAME?: string;
    __IS_COORDINATOR?: boolean;
    __toast?: (message: string, type?: ToastType, duration?: number) => void;
    cancelBookingUI?: (id: string) => Promise<void>;
  }
}

export {};
