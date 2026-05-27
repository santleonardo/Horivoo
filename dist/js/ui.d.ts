/**
 * ui.ts — Utilitários de interface reutilizáveis
 */
import type { ToastType, BookingSlotInfo, BookingConfirmData, TeacherSlotInfo, TeacherSlotAction, GridMode, GridCallbacks, WeekStats, BlockedSlot, Booking } from './types.js';
/**
 * Exibe um toast
 */
export declare function toast(message: string, type?: ToastType, duration?: number): void;
/**
 * Abre o modal de agendamento
 */
export declare function openBookingModal(slotInfo: BookingSlotInfo, onConfirm: (data: BookingConfirmData) => void): void;
/**
 * Abre o modal do professor para bloquear/desbloquear horário
 */
export declare function openTeacherSlotModal(slotInfo: TeacherSlotInfo, onConfirm: (action: TeacherSlotAction) => void): void;
export declare function closeModal(): void;
/**
 * Mostra/oculta estado de carregamento num container
 */
export declare function setLoading(containerId: string, isLoading: boolean, message?: string): void;
/**
 * Renderiza a grade semanal com horários dinâmicos.
 */
export declare function renderWeekGrid(containerId: string, blocked: BlockedSlot[], booked: Booking[], mode: GridMode, callbacks?: GridCallbacks): void;
/**
 * Calcula estatísticas da semana
 */
export declare function calcStats(blocked: BlockedSlot[], booked: Booking[], totalSlots: number): WeekStats;
//# sourceMappingURL=ui.d.ts.map