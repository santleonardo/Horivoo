/**
 * /api/appointments — CRUD de agendamentos
 * GET:  qualquer autenticado, com filtro obrigatório por papel
 * POST: coordinator only — usa checkAvailability
 *
 * Segurança: teacher e student nunca recebem dados de outros usuários,
 * mesmo que passem teacherId/studentId diferentes no query param.
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
    const where: Row = {};

    // Coordinator: aceita filtros do cliente
    if (authResult.role === 'coordinator') {
      const teacherId = searchParams.get('teacherId');
      const studentId = searchParams.get('studentId');
      const classId   = searchParams.get('classId');
      const date      = searchParams.get('date');
      const status    = searchParams.get('status');
      const from      = searchParams.get('from');
      const to        = searchParams.get('to');
      if (teacherId) where['teacher_id'] = teacherId;
      if (studentId) where['student_id'] = studentId;
      if (classId)   where['class_id']   = classId;
      if (date)      where['date']        = date;
      if (status)    where['status']      = status;
      if (from && to) where['date'] = { gte: from, lte: to } as never;
      else if (from)  where['date'] = { gte: from } as never;
    }

    // Teacher: força próprio teacher_id (ignora query param)
    if (authResult.role === 'teacher') {
      const teacher = await db.teacher.findUnique({ where: { user_id: authResult.userId } });
      if (!teacher) return NextResponse.json({ appointments: [] });
      where['teacher_id'] = (teacher as Row)['id'];
      const date   = searchParams.get('date');
      const status = searchParams.get('status');
      const from   = searchParams.get('from');
      const to     = searchParams.get('to');
      if (date)   where['date']   = date;
      if (status) where['status'] = status;
      if (from && to) where['date'] = { gte: from, lte: to } as never;
      else if (from)  where['date'] = { gte: from } as never;
    }

    // Student: força próprio student_id (ignora query param)
    if (authResult.role === 'student') {
      where['student_id'] = authResult.userId;
      const status = searchParams.get('status');
      const from   = searchParams.get('from');
      const to     = searchParams.get('to');
      if (status) where['status'] = status;
      if (from && to) where['date'] = { gte: from, lte: to } as never;
      else if (from)  where['date'] = { gte: from } as never;
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
      bookingType?: string;
      originalBookingId?: string;
      notes?: string;
    };

    const { teacherId, studentId, classId, date, startTime, endTime,
            recurringGroupId, bookingType, originalBookingId, notes } = body;

    if (!teacherId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const availability = await checkAvailability({ teacherId, date, startTime, endTime });
    if (!availability.available) {
      return NextResponse.json({ error: availability.reason }, { status: 400 });
    }

    const dayOfWeek = new Date(date + 'T12:00:00').getDay();
    const appointment = await db.appointment.create({
      data: {
        teacher_id:          teacherId,
        student_id:          studentId          || null,
        class_id:            classId            || null,
        date,
        day_of_week:         dayOfWeek,
        start_time:          startTime,
        end_time:            endTime,
        status:              'confirmed',
        recurring_group_id:  recurringGroupId   || null,
        booking_type:        bookingType        || 'normal',
        original_booking_id: originalBookingId  || null,
        notes:               notes              || '',
      },
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error('[appointments POST]', error);
    return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 });
  }
}
