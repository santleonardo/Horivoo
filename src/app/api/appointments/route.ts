/**
 * /api/appointments — CRUD de agendamentos (appointments)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

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
    if (user.role === 'teacher') {
      const teacher = await db.teacher.findUnique({ where: { user_id: user.userId } });
      if (teacher) where['teacher_id'] = (teacher as Row)['id'];
    }
    if (user.role === 'student') {
      where['student_id'] = user.userId;
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
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    // Only coordinators can create appointments
    if (user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Apenas coordenadores podem criar agendamentos' }, { status: 403 });
    }

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

    // Validate: check availability, conflicts, holidays, recesses
    const dayOfWeek = new Date(date + 'T12:00:00').getDay();

    const [avail, existing, holiday, recess] = await Promise.all([
      db.availableSlot.findFirst({
        where: { teacher_id: teacherId, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime },
      }),
      db.appointment.findFirst({
        where: { teacher_id: teacherId, date, start_time: startTime, status: 'confirmed' },
      }),
      db.holiday.findFirst({ where: { date } }),
      db.recess.findFirst({ where: { start_date: { lte: date }, end_date: { gte: date } } }),
    ]);

    if (!avail)    return NextResponse.json({ error: 'Horário não disponível para este professor' }, { status: 400 });
    if (existing)  return NextResponse.json({ error: 'Já existe agendamento neste horário' }, { status: 400 });
    if (holiday)   return NextResponse.json({ error: 'Feriado' }, { status: 400 });
    if (recess)    return NextResponse.json({ error: 'Período de recesso' }, { status: 400 });

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
