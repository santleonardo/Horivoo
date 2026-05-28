import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { format } from 'date-fns';

export async function GET() {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');

    const [bookings, holidays, recesses, teachers, availableSlots] = await Promise.all([
      db.booking.findMany({
        where: { date: { gte: today } },
        orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
        take: 200,
      }),
      db.holiday.findMany({ orderBy: { date: 'asc' } }),
      db.recess.findMany({ orderBy: { start_date: 'asc' } }),
      db.teacher.findMany({ orderBy: { name: 'asc' } }),
      db.availableSlot.findMany({}),
    ]);

    type Row = Record<string, unknown>;

    // Enrich bookings with teacher names
    const tMap = new Map((teachers as Row[]).map(t => [t['id'], t]));
    const enrichedBookings = (bookings as Row[]).map(b => ({
      ...b,
      // camelCase para o frontend
      startTime: b['start_time'],
      endTime: b['end_time'],
      studentName: b['student_name'],
      teacherId: b['teacher_id'],
      teacher: tMap.get(b['teacher_id'] as string) || null,
    }));

    // Normalize recesses to camelCase
    const normalizedRecesses = (recesses as Row[]).map(r => ({
      ...r,
      startDate: r['start_date'],
      endDate: r['end_date'],
    }));

    // Attach availableSlots to teachers in camelCase
    const enrichedTeachers = (teachers as Row[]).map(t => ({
      id: t['id'],
      name: t['name'],
      email: t['email'],
      availableSlots: (availableSlots as Row[])
        .filter(s => s['teacher_id'] === t['id'])
        .map(s => ({
          id: s['id'],
          dayOfWeek: s['day_of_week'],    // ← camelCase que o frontend espera
          startTime: s['start_time'],
          endTime: s['end_time'],
        })),
    }));

    return NextResponse.json({
      bookings: enrichedBookings,
      holidays,
      recesses: normalizedRecesses,
      teachers: enrichedTeachers,
    });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados do calendário' }, { status: 500 });
  }
}
