/**
 * /api/bookings-teacher/route.ts
 * GET: Returns bookings filtered by teacherId with optional date range (from/to).
 * Used by MinhaAgendaPage for teacher-specific schedule view.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { addDays, format, parse } from 'date-fns';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'coordinator', 'teacher', 'student');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const fromStr   = searchParams.get('from');
    const toStr     = searchParams.get('to');
    const status    = searchParams.get('status');

    if (!teacherId) {
      return NextResponse.json({ error: 'teacherId é obrigatório' }, { status: 400 });
    }

    // Teachers can only fetch their own bookings
    if (authResult.role === 'teacher') {
      const teacher = await db.teacher.findUnique({ where: { user_id: authResult.userId } });
      const teacherRow = teacher as Row | null;
      if (!teacher || teacherRow?.['id'] !== teacherId) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
    }

    const where: Row = { teacher_id: teacherId };
    if (status) where['status'] = status;

    if (fromStr && toStr) {
      const from = parse(fromStr, 'yyyy-MM-dd', new Date());
      const to   = parse(toStr,   'yyyy-MM-dd', new Date());
      const dates: string[] = [];
      let cur = from;
      while (cur <= to && dates.length < 62) {
        dates.push(format(cur, 'yyyy-MM-dd'));
        cur = addDays(cur, 1);
      }
      where['date'] = { in: dates };
    }

    const bookings = await db.booking.findMany({
      where,
      orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
    });

    // Enrich with teacher info
    const teacher = await db.teacher.findUnique({ where: { id: teacherId } });
    const teacherRow = teacher as Row | null;

    const enriched = (bookings as Row[]).map(b => ({
      ...b,
      start_time:   b['start_time'],
      end_time:     b['end_time'],
      studentName:  b['student_name'],
      studentEmail: b['student_email'],
      booking_type: b['booking_type'],
      teacherName:  teacherRow?.['name'] ?? '',
      teacher:      teacher || null,
    }));

    return NextResponse.json({ bookings: enriched });
  } catch (error) {
    console.error('[bookings-teacher GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar agenda do professor' }, { status: 500 });
  }
}
