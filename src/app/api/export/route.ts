import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addDays, format, parse, startOfWeek, getDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formatType = searchParams.get('format') || 'csv';
    const teacherId = searchParams.get('teacherId');
    const weekStartStr = searchParams.get('weekStart');
    const month = searchParams.get('month'); // YYYY-MM

    let dates: string[] = [];

    if (weekStartStr) {
      const weekStart = parse(weekStartStr, 'yyyy-MM-dd', new Date());
      for (let i = 0; i < 7; i++) {
        dates.push(format(addDays(weekStart, i), 'yyyy-MM-dd'));
      }
    } else if (month) {
      const monthStart = parse(`${month}-01`, 'yyyy-MM-dd', new Date());
      const year = monthStart.getFullYear();
      const m = monthStart.getMonth();
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        dates.push(format(new Date(year, m, i), 'yyyy-MM-dd'));
      }
    } else {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      for (let i = 0; i < 7; i++) {
        dates.push(format(addDays(weekStart, i), 'yyyy-MM-dd'));
      }
    }

    const where: Record<string, unknown> = { date: { in: dates } };
    if (teacherId) where.teacherId = teacherId;

    const [bookings, availableSlots, blockedSlots, nonClassDays, holidays] = await Promise.all([
      db.booking.findMany({
        where,
        include: { teacher: true },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      }),
      db.availableSlot.findMany({
        where: teacherId ? { teacherId } : {},
      }),
      db.blockedSlot.findMany({
        where: teacherId ? { teacherId, date: { in: dates } } : { date: { in: dates } },
      }),
      db.nonClassDay.findMany({ where: { date: { in: dates } } }),
      db.holiday.findMany({ where: { date: { in: dates } } }),
    ]);

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    if (formatType === 'csv') {
      const rows: string[] = [];

      // Build a map for quick lookup
      const bookedKeys = new Set(bookings.map(b => `${b.date}-${b.startTime}-${b.endTime}-${b.teacherId}`));
      const blockedKeys = new Set(blockedSlots.map(b => `${b.date}-${b.startTime}-${b.endTime}-${b.teacherId}`));
      const nonClassDateSet = new Set(nonClassDays.map(n => n.date));
      const holidayDateSet = new Set(holidays.map(h => h.date));

      // Process booked slots
      for (const b of bookings) {
        const dateObj = new Date(b.date + 'T12:00:00');
        const dayName = dayNames[dateObj.getDay()];
        rows.push(`${b.date},${dayName},${b.startTime}-${b.endTime},${b.teacher.name},${b.studentName},Agendado`);
      }

      // Process available + blocked + non-class + holiday slots
      const teacherIds = teacherId ? [teacherId] : [...new Set(availableSlots.map(s => s.teacherId))];
      const teacherMap = new Map<string, string>();

      const teachers = await db.teacher.findMany({
        where: { id: { in: teacherIds } },
      });
      for (const t of teachers) {
        teacherMap.set(t.id, t.name);
      }

      for (const date of dates) {
        const dateObj = new Date(date + 'T12:00:00');
        const dow = getDay(dateObj);
        const dayName = dayNames[dow];
        const isNonClassDay = nonClassDateSet.has(date);
        const isHoliday = holidayDateSet.has(date);

        const daySlots = availableSlots.filter(s => s.dayOfWeek === dow);

        for (const slot of daySlots) {
          const key = `${date}-${slot.startTime}-${slot.endTime}-${slot.teacherId}`;
          if (bookedKeys.has(key)) continue; // already added above

          const teacherName = teacherMap.get(slot.teacherId) || '';

          if (isNonClassDay || isHoliday) {
            rows.push(`${date},${dayName},${slot.startTime}-${slot.endTime},${teacherName},,Dia sem aula`);
          } else if (blockedKeys.has(key)) {
            rows.push(`${date},${dayName},${slot.startTime}-${slot.endTime},${teacherName},,Bloqueado`);
          } else {
            rows.push(`${date},${dayName},${slot.startTime}-${slot.endTime},${teacherName},,Disponível`);
          }
        }
      }

      const csv = ['Data,Dia,Horário,Professor,Aluno,Status', ...rows].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename=horivoo-agenda.csv',
        },
      });
    }

    return NextResponse.json({ error: 'Formato não suportado' }, { status: 400 });
  } catch (error) {
    console.error('Error exporting:', error);
    return NextResponse.json({ error: 'Erro ao exportar' }, { status: 500 });
  }
}
