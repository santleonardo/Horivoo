/**
 * /api/recurring-bookings — Recurring bookings
 * GET: All authenticated users can view
 * POST: Only coordinator can create recurring bookings
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'coordinator', 'teacher', 'student');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const where: Row = {};
    if (teacherId) where['teacher_id'] = teacherId;

    // Role-based filtering
    if (authResult.role === 'teacher') {
      const teacher = await db.teacher.findUnique({ where: { user_id: authResult.userId } });
      if (teacher) where['teacher_id'] = (teacher as Row)['id'];
    }

    const recurringBookings = await db.recurringBooking.findMany({
      where,
      orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
    });

    const tIds = [...new Set((recurringBookings as Row[]).map(r => r['teacherId'] as string))];
    const teachers = tIds.length ? await db.teacher.findMany({ where: { id: { in: tIds } } }) : [];
    const tMap = new Map((teachers as Row[]).map(t => [t['id'], t]));
    const enriched = (recurringBookings as Row[]).map(r => ({ ...r, teacher: tMap.get(r['teacherId'] as string) || null }));

    return NextResponse.json({ recurringBookings: enriched });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar agendamentos recorrentes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'coordinator');
    if (authResult instanceof NextResponse) return authResult;

    const { teacherId, studentName, studentEmail, dayOfWeek, startTime, endTime } = await request.json() as { teacherId: string; studentName: string; studentEmail?: string; dayOfWeek: number; startTime: string; endTime: string };
    if (!teacherId || !studentName || dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }
    const recurringBooking = await db.recurringBooking.create({
      data: { teacher_id: teacherId, student_name: studentName, student_email: studentEmail || null, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime },
    });
    return NextResponse.json({ recurringBooking }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar agendamento recorrente' }, { status: 500 });
  }
}
