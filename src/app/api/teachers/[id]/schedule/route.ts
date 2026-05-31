/**
 * /api/teachers/[id]/schedule — Agenda semanal do professor
 * GET: qualquer autenticado
 * Fonte única: appointments (nunca bookings)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { addDays, format, parse, startOfWeek, getDay } from 'date-fns';

type Row = Record<string, unknown>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, 'coordinator', 'teacher', 'student');
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const weekStartStr = searchParams.get('weekStart');

    const weekStart = weekStartStr
      ? parse(weekStartStr, 'yyyy-MM-dd', new Date())
      : startOfWeek(new Date(), { weekStartsOn: 1 });

    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) weekDates.push(format(addDays(weekStart, i), 'yyyy-MM-dd'));

    const [availableSlots, blockedSlots, appointments, nonClassDays, holidays] = await Promise.all([
      db.availableSlot.findMany({ where: { teacher_id: id }, orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }] }),
      db.blockedSlot.findMany({ where: { teacher_id: id, date: { in: weekDates } } }),
      // Fonte única: appointments
      db.appointment.findMany({ where: { teacher_id: id, date: { in: weekDates }, status: 'confirmed' } }),
      db.nonClassDay.findMany({ where: { date: { in: weekDates } } }),
      db.holiday.findMany({ where: { date: { in: weekDates } } }),
    ]);

    const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const schedule: Row[] = [];

    for (let i = 0; i < 7; i++) {
      const date      = format(addDays(weekStart, i), 'yyyy-MM-dd');
      const dayOfWeek = getDay(addDays(weekStart, i));
      const nonClassDay = (nonClassDays as Row[]).find(n => n['date'] === date);
      const holiday     = (holidays as Row[]).find(h => h['date'] === date);
      const daySlots    = (availableSlots as Row[]).filter(s => s['dayOfWeek'] === dayOfWeek);

      const slots = daySlots.map(slot => {
        if (nonClassDay || holiday) {
          return { startTime: slot['startTime'], endTime: slot['endTime'], status: 'non_class_day' };
        }
        const bl = (blockedSlots as Row[]).find(b => b['date'] === date && b['startTime'] === slot['startTime']);
        if (bl) {
          return { startTime: slot['startTime'], endTime: slot['endTime'], status: 'blocked', reason: bl['reason'] };
        }
        const ap = (appointments as Row[]).find(a => a['date'] === date && a['startTime'] === slot['startTime']);
        if (ap) {
          return {
            startTime: slot['startTime'], endTime: slot['endTime'], status: 'booked',
            appointment: {
              id: ap['id'], studentId: ap['studentId'], classId: ap['classId'],
              bookingType: ap['bookingType'], recurringGroupId: ap['recurringGroupId'],
            },
          };
        }
        return { startTime: slot['startTime'], endTime: slot['endTime'], status: 'available' };
      });

      schedule.push({
        date, dayOfWeek, dayName: DAY_NAMES[dayOfWeek],
        isNonClassDay: !!nonClassDay, nonClassReason: nonClassDay ? nonClassDay['reason'] : undefined,
        isHoliday: !!holiday, holidayName: holiday ? holiday['name'] : undefined,
        slots,
      });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('[teachers/schedule GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar agenda' }, { status: 500 });
  }
}
