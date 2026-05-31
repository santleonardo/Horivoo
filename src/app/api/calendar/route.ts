/**
 * /api/calendar — Dados públicos do calendário (appointments, holidays, recesses)
 * Fonte única: appointments (nunca bookings)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { format } from 'date-fns';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'coordinator', 'teacher', 'student');
    if (authResult instanceof NextResponse) return authResult;

    const today = format(new Date(), 'yyyy-MM-dd');

    const [appointments, holidays, recesses, teachers] = await Promise.all([
      db.appointment.findMany({
        where: { date: { gte: today } },
        orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
        take: 200,
      }),
      db.holiday.findMany({ orderBy: { date: 'asc' } }),
      db.recess.findMany({ orderBy: { start_date: 'asc' } }),
      db.teacher.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const tMap = new Map((teachers as Row[]).map(t => [t['id'], t]));
    const enriched = (appointments as Row[]).map(a => ({
      ...a,
      teacher: tMap.get(a['teacherId'] as string) || null,
    }));

    return NextResponse.json({ appointments: enriched, holidays, recesses, teachers });
  } catch (error) {
    console.error('[calendar GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar dados do calendário' }, { status: 500 });
  }
}
