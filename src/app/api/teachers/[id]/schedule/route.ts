import { NextRequest, NextResponse } from 'next/server';
import { all } from '@/lib/db';
import { addDays, format, parse, startOfWeek, getDay } from 'date-fns';

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
    const datePlaceholders = weekDates.map(() => '?').join(',');

    const [availableSlots, blockedSlots, bookings, nonClassDays, holidays, recurringBookings] = [
      all('SELECT * FROM available_slots WHERE teacher_id = ? ORDER BY day_of_week ASC, start_time ASC', [id]),
      all(`SELECT * FROM blocked_slots WHERE teacher_id = ? AND date IN (${datePlaceholders})`, [id, ...weekDates]),
      all(`SELECT * FROM bookings WHERE teacher_id = ? AND date IN (${datePlaceholders})`, [id, ...weekDates]),
      all(`SELECT * FROM non_class_days WHERE date IN (${datePlaceholders})`, weekDates),
      all(`SELECT * FROM holidays WHERE date IN (${datePlaceholders})`, weekDates),
      all('SELECT * FROM recurring_bookings WHERE teacher_id = ? AND active = 1', [id]),
    ];

    const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const schedule: Record<string, unknown>[] = [];

    for (let i = 0; i < 7; i++) {
      const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
      const dayOfWeek = getDay(addDays(weekStart, i));

      const nonClassDay = nonClassDays.find(n => n['date'] === date);
      const holiday = holidays.find(h => h['date'] === date);
      const daySlots = availableSlots.filter(s => s['day_of_week'] === dayOfWeek);

      const slots = daySlots.map(slot => {
        if (nonClassDay || holiday) return { startTime: slot['start_time'], endTime: slot['end_time'], status: 'non_class_day' };
        const bl = blockedSlots.find(b => b['date'] === date && b['start_time'] === slot['start_time']);
        if (bl) return { startTime: slot['start_time'], endTime: slot['end_time'], status: 'blocked', blockedSlot: { id: bl['id'], reason: bl['reason'] } };
        const bk = bookings.find(b => b['date'] === date && b['start_time'] === slot['start_time']);
        if (bk) return { startTime: slot['start_time'], endTime: slot['end_time'], status: 'booked', booking: { id: bk['id'], studentName: bk['student_name'], studentEmail: bk['student_email'], recurring: !!bk['recurring_id'] } };
        const rec = recurringBookings.find(r => r['day_of_week'] === dayOfWeek && r['start_time'] === slot['start_time']);
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
