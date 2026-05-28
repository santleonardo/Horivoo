import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addDays, format, parse, startOfWeek, getDay } from 'date-fns';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const weekStartStr = searchParams.get('weekStart');

    const weekStart = weekStartStr
      ? parse(weekStartStr, 'yyyy-MM-dd', new Date())
      : startOfWeek(new Date(), { weekStartsOn: 1 });

    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) weekDates.push(format(addDays(weekStart, i), 'yyyy-MM-dd'));

    const [availableSlots, blockedSlots, bookings, nonClassDays, holidays, recurringBookings] = await Promise.all([
      db.availableSlot.findMany({ where: { teacher_id: id }, orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }] }),
      db.blockedSlot.findMany({ where: { teacher_id: id, date: { in: weekDates } } }),
      db.booking.findMany({ where: { teacher_id: id, date: { in: weekDates } } }),
      db.nonClassDay.findMany({ where: { date: { in: weekDates } } }),
      db.holiday.findMany({ where: { date: { in: weekDates } } }),
      db.recurringBooking.findMany({ where: { teacher_id: id, active: true } }),
    ]);

    const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const schedule: Row[] = [];

    for (let i = 0; i < 7; i++) {
      const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
      const dayOfWeek = getDay(addDays(weekStart, i));

      const nonClassDay = (nonClassDays as Row[]).find(n => n['date'] === date);
      const holiday = (holidays as Row[]).find(h => h['date'] === date);
      const daySlots = (availableSlots as Row[]).filter(s => s['day_of_week'] === dayOfWeek);

      const slots = daySlots.map(slot => {
        if (nonClassDay || holiday) return { startTime: slot['start_time'], endTime: slot['end_time'], status: 'non_class_day' };
        const bl = (blockedSlots as Row[]).find(b => b['date'] === date && b['start_time'] === slot['start_time']);
        if (bl) return { startTime: slot['start_time'], endTime: slot['end_time'], status: 'blocked', blockedSlot: { id: bl['id'], reason: bl['reason'] } };
        const bk = (bookings as Row[]).find(b => b['date'] === date && b['start_time'] === slot['start_time']);
        if (bk) return { startTime: slot['start_time'], endTime: slot['end_time'], status: 'booked', booking: { id: bk['id'], studentName: bk['student_name'], studentEmail: bk['student_email'], recurring: !!bk['recurring_id'] } };
        const rec = (recurringBookings as Row[]).find(r => r['day_of_week'] === dayOfWeek && r['start_time'] === slot['start_time']);
        if (rec) return { startTime: slot['start_time'], endTime: slot['end_time'], status: 'booked', booking: { studentName: rec['student_name'], recurring: true, recurringId: rec['id'] } };
        return { startTime: slot['start_time'], endTime: slot['end_time'], status: 'available' };
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
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar agenda' }, { status: 500 });
  }
}
