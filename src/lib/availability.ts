/**
 * availability.ts — Verificação centralizada de disponibilidade
 * Todas as consultas são executadas em paralelo com Promise.all
 */
import { db } from './db';

interface AvailabilityCheck {
  teacherId: string;
  date: string;       // yyyy-MM-dd
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
}

export async function checkAvailability(
  params: AvailabilityCheck
): Promise<{ available: boolean; reason?: string }> {
  const { teacherId, date, startTime, endTime } = params;
  const dayOfWeek = new Date(date + 'T12:00:00').getDay();

  // Todas as 7 consultas em paralelo
  const [slot, existing, blocked, nonClass, holiday, recess, blockedPeriod] = await Promise.all([
    db.availableSlot.findFirst({
      where: { teacher_id: teacherId, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime },
    }),
    db.booking.findFirst({
      where: { teacher_id: teacherId, date, start_time: startTime, status: 'confirmed' },
    }),
    db.blockedSlot.findFirst({
      where: { teacher_id: teacherId, date, start_time: startTime },
    }),
    db.nonClassDay.findFirst({ where: { date } }),
    db.holiday.findFirst({ where: { date } }),
    db.recess.findFirst({
      where: { start_date: { lte: date }, end_date: { gte: date } },
    }),
    db.blockedPeriod.findFirst({
      where: { teacher_id: teacherId, start_date: { lte: date }, end_date: { gte: date } },
    }),
  ]);

  if (!slot)          return { available: false, reason: 'Horário não disponível para este professor' };
  if (existing)       return { available: false, reason: 'Já existe agendamento neste horário' };
  if (blocked)        return { available: false, reason: 'Horário bloqueado' };
  if (nonClass)       return { available: false, reason: 'Dia sem aula' };
  if (holiday)        return { available: false, reason: 'Feriado' };
  if (recess)         return { available: false, reason: 'Período de recesso' };
  if (blockedPeriod)  return { available: false, reason: 'Professor indisponível nesta data' };

  return { available: true };
}
