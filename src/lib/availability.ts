/**
 * availability.ts — Central availability checking utility
 * Validates if a teacher is available for a given date/time slot
 * by checking availability slots, existing bookings, blocked slots,
 * non-class days, holidays, recesses, and blocked periods.
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

  // 1. Check if teacher has availability for this day/time
  const slot = await db.availableSlot.findFirst({
    where: { teacher_id: teacherId, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime },
  });
  if (!slot) return { available: false, reason: 'Horário não disponível para este professor' };

  // 2. Check for existing booking
  const existing = await db.booking.findFirst({
    where: { teacher_id: teacherId, date, start_time: startTime, status: 'confirmed' },
  });
  if (existing) return { available: false, reason: 'Já existe agendamento neste horário' };

  // 3. Check for blocked slot
  const blocked = await db.blockedSlot.findFirst({
    where: { teacher_id: teacherId, date, start_time: startTime },
  });
  if (blocked) return { available: false, reason: 'Horário bloqueado' };

  // 4. Check non-class day
  const nonClass = await db.nonClassDay.findFirst({ where: { date } });
  if (nonClass) return { available: false, reason: 'Dia sem aula' };

  // 5. Check holiday
  const holiday = await db.holiday.findFirst({ where: { date } });
  if (holiday) return { available: false, reason: 'Feriado' };

  // 6. Check recess
  const recess = await db.recess.findFirst({
    where: { start_date: { lte: date }, end_date: { gte: date } },
  });
  if (recess) return { available: false, reason: 'Período de recesso' };

  // 7. Check blocked period
  const blockedPeriod = await db.blockedPeriod.findFirst({
    where: { teacher_id: teacherId, start_date: { lte: date }, end_date: { gte: date } },
  });
  if (blockedPeriod) return { available: false, reason: 'Professor indisponível nesta data' };

  return { available: true };
}
