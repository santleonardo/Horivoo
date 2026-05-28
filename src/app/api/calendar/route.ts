import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { format } from 'date-fns';

export async function GET() {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');

    const [bookings, holidays, recesses, teachers] = await Promise.all([
      db.booking.findMany({
        where: { date: { gte: today } },
        orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
        take: 100,
      }),
      db.holiday.findMany({ orderBy: { date: 'asc' } }),
      db.recess.findMany({ orderBy: { start_date: 'asc' } }),
      db.teacher.findMany({ orderBy: { name: 'asc' } }),
    ]);

    // Enrich bookings with teacher names
    const tMap = new Map((teachers as Record<string, unknown>[]).map(t => [t.id, t]));
    const enrichedBookings = (bookings as Record<string, unknown>[]).map(b => ({
      ...b,
      teacher: tMap.get(b.teacher_id as string) || null,
    }));

    return NextResponse.json({ bookings: enrichedBookings, holidays, recesses, teachers });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados do calendário' }, { status: 500 });
  }
}
