/**
 * availability.ts — Verificação centralizada de disponibilidade.
 * Fonte única de verdade. Consulta apenas appointments (nunca bookings).
 *
 * Ordem de verificação:
 *  1. Slot configurado em available_slots
 *  2. Conflito com appointment existente (confirmado)
 *  3. Slot bloqueado pontualmente (blocked_slots)
 *  4. Dia sem aula (non_class_days)
 *  5. Feriado (holidays)
 *  6. Recesso (recesses)
 *  7. Período de indisponibilidade do professor (blocked_periods)
 */
import { db } from './db';

interface AvailabilityCheck {
  teacherId: string;
  date: string;        // yyyy-MM-dd
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  excludeAppointmentId?: string; // ignorar ao reagendar
}

export async function checkAvailability(
  params: AvailabilityCheck
): Promise<{ available: boolean; reason?: string }> {
  const { teacherId, date, startTime, endTime, excludeAppointmentId } = params;
  const dayOfWeek = new Date(date + 'T12:00:00').getDay();

  // Todas as consultas em paralelo para performance
  const [slot, existing, blocked, nonClass, holiday, recess, blockedPeriod] = await Promise.all([

    // 1. Slot disponível na grade do professor
    db.availableSlot.findFirst({
      where: { teacher_id: teacherId, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime },
    }),

    // 2. Appointment já existente no mesmo horário (fonte única — appointments)
    db.appointment.findFirst({
      where: {
        teacher_id: teacherId,
        date,
        start_time: startTime,
        status: 'confirmed',
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } as never } : {}),
      },
    }),

    // 3. Slot bloqueado pontualmente
    db.blockedSlot.findFirst({
      where: { teacher_id: teacherId, date, start_time: startTime },
    }),

    // 4. Dia sem aula
    db.nonClassDay.findFirst({ where: { date } }),

    // 5. Feriado
    db.holiday.findFirst({ where: { date } }),

    // 6. Recesso
    db.recess.findFirst({
      where: { start_date: { lte: date }, end_date: { gte: date } },
    }),

    // 7. Professor indisponível no período
    db.blockedPeriod.findFirst({
      where: { teacher_id: teacherId, start_date: { lte: date }, end_date: { gte: date } },
    }),
  ]);

  if (!slot)          return { available: false, reason: 'Horário não configurado para este professor' };
  if (existing)       return { available: false, reason: 'Já existe agendamento neste horário' };
  if (blocked)        return { available: false, reason: 'Horário bloqueado' };
  if (nonClass)       return { available: false, reason: 'Dia sem aula' };
  if (holiday)        return { available: false, reason: `Feriado: ${(holiday as Record<string, unknown>)['name'] || ''}` };
  if (recess)         return { available: false, reason: 'Período de recesso' };
  if (blockedPeriod)  return { available: false, reason: 'Professor indisponível nesta data' };

  return { available: true };
}
