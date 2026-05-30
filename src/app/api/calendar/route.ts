import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { format } from 'date-fns';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, 'coordinator', 'teacher', 'student');
  if (authResult instanceof NextResponse) return authResult;

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

    const tMap = new Map((teachers as Row[]).map(t => [t['id'], t]));
    const enrichedBookings = (bookings as Row[]).map(b => ({
      ...b,
      teacher: tMap.get(b['teacherId'] as string) || null,
    }));

    return NextResponse.json({ bookings: enrichedBookings, holidays, recesses, teachers });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados do calendário' }, { status: 500 });
  }
}
