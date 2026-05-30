/**
 * /api/appointments — CRUD de agendamentos (appointments)
 * GET: All authenticated users, with role-based filtering
 * POST: Only coordinator can create, uses checkAvailability
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { checkAvailability } from '@/lib/availability';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'coordinator', 'teacher', 'student');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const studentId = searchParams.get('studentId');
    const classId = searchParams.get('classId');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    const where: Row = {};
    if (teacherId) where['teacher_id'] = teacherId;
    if (studentId) where['student_id'] = studentId;
    if (classId)   where['class_id'] = classId;
    if (date)      where['date'] = date;
    if (status)    where['status'] = status;

    // Role-based filtering
    if (authResult.role === 'teacher') {
      const teacher = await db.teacher.findUnique({ where: { user_id: authResult.userId } });
      if (teacher) where['teacher_id'] = (teacher as Row)['id'];
    }
    if (authResult.role === 'student') {
      where['student_id'] = authResult.userId;
    }

    const appointments = await db.appointment.findMany({
      where,
      orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('[appointments GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only coordinators can create appointments
    const authResult = await requireRole(request, 'coordinator');
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json() as {
      teacherId: string;
      studentId?: string;
      classId?: string;
      date: string;
      startTime: string;
      endTime: string;
      recurringGroupId?: string;
      notes?: string;
    };

    const { teacherId, studentId, classId, date, startTime, endTime, recurringGroupId, notes } = body;

    if (!teacherId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    // Use centralized checkAvailability
    const availability = await checkAvailability({ teacherId, date, startTime, endTime });
    if (!availability.available) {
      return NextResponse.json({ error: availability.reason }, { status: 400 });
    }

    const dayOfWeek = new Date(date + 'T12:00:00').getDay();

    const data: Row = {
      teacher_id: teacherId,
      student_id: studentId || null,
      class_id: classId || null,
      date,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      status: 'confirmed',
      recurring_group_id: recurringGroupId || null,
      notes: notes || '',
    };

    const appointment = await db.appointment.create({ data });
    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error('[appointments POST]', error);
    return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 });
  }
}
