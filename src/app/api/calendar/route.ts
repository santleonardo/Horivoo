import { NextResponse } from 'next/server';
import { all, get } from '@/lib/db';
import { format } from 'date-fns';

export async function GET() {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');

    const bookings = all('SELECT * FROM bookings WHERE date >= ? ORDER BY date ASC, start_time ASC LIMIT 100', [today]);
    const holidays = all('SELECT * FROM holidays ORDER BY date ASC');
    const recesses = all('SELECT * FROM recesses ORDER BY start_date ASC');
    const teachers = all('SELECT * FROM teachers ORDER BY name ASC');

    // Fetch available slots for all teachers
    const teacherIds = teachers.map(t => t.id as string);
    let availableSlots: Record<string, unknown>[] = [];
    if (teacherIds.length) {
      const placeholders = teacherIds.map(() => '?').join(',');
      availableSlots = all(`SELECT * FROM available_slots WHERE teacher_id IN (${placeholders}) ORDER BY day_of_week ASC, start_time ASC`, teacherIds);
    }

    // Enrich bookings with teacher names
    const tMap = new Map(teachers.map(t => [t.id as string, t]));
    const enrichedBookings = bookings.map(b => ({
      ...b,
      teacher: tMap.get(b.teacher_id as string) || null,
    }));

    // Enrich teachers with availableSlots (ensure always an array)
    const enrichedTeachers = teachers.map(t => ({
      ...t,
      availableSlots: Array.isArray(availableSlots)
        ? availableSlots
            .filter(s => s.teacher_id === t.id)
            .map(s => ({ dayOfWeek: s.day_of_week, startTime: s.start_time, endTime: s.end_time }))
        : [],
    }));

    return NextResponse.json({ bookings: enrichedBookings, holidays, recesses, teachers: enrichedTeachers });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados do calendário' }, { status: 500 });
  }
}
