/**
 * api.ts — Serviço de comunicação com o Supabase
 *
 * FIX: credenciais agora são lidas via getter lazy (função), evitando
 * o problema de modules ES serem avaliados antes do override ser definido.
 */
import type { Teacher, BlockedSlot, Booking, Coordinator, CreateBookingData, UpdateTeacherData, RealtimeCallback, UnsubscribeFn } from './types.js';
export declare function getTeachers(): Promise<Teacher[]>;
export declare function getTeacherByUserId(userId: string): Promise<Teacher | null>;
export declare function createTeacherProfile(userId: string, name: string, email: string): Promise<Teacher>;
export declare function updateTeacher(id: string, data: UpdateTeacherData): Promise<Teacher[]>;
export declare function deleteTeacher(id: string): Promise<unknown>;
export declare function getBlockedSlots(teacherId: string): Promise<BlockedSlot[]>;
export declare function getAllBlockedSlots(): Promise<BlockedSlot[]>;
export declare function blockSlot(teacherId: string, day: string, hour: string): Promise<BlockedSlot | BlockedSlot[]>;
export declare function unblockSlot(slotId: string): Promise<unknown>;
export declare function getBookings(teacherId: string): Promise<Booking[]>;
export declare function getAllBookings(): Promise<Booking[]>;
export declare function createBooking(data: CreateBookingData): Promise<Booking | Booking[]>;
export declare function updateBooking(bookingId: string, data: Partial<CreateBookingData>): Promise<Booking[]>;
export declare function cancelBooking(bookingId: string): Promise<unknown>;
export declare function getCoordinatorByUserId(userId: string): Promise<Coordinator | null>;
export declare function subscribeTable(table: string, callback: RealtimeCallback): UnsubscribeFn;
//# sourceMappingURL=api.d.ts.map