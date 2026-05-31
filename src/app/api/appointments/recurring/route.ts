/**
 * /api/appointments/recurring — Criação de agendamentos recorrentes
 * POST: coordinator only
 * Usa checkAvailability para cada data — bloqueia conflicts, feriados,
 * recessos, blocked_slots e blocked_periods.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { checkAvailability } from '@/lib/availability';
import { addDays, format, parse } from 'date-fns';

type Row = Record<string, unknown>;

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'coordinator');
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json() as {
      teacherId: string;
      studentId?: string;
      classId?: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      startDate: string;
      endDate: string;
      notes?: string;
    };

    const { teacherId, studentId, classId, dayOfWeek, startTime, endTime, startDate, endDate, notes } = body;

    if (!teacherId || dayOfWeek === undefined || !startTime || !endTime || !startDate || !endDate) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const recurringGroupId = crypto.randomUUID();
    const start = parse(startDate, 'yyyy-MM-dd', new Date());
    const end   = parse(endDate,   'yyyy-MM-dd', new Date());
    const dates: string[] = [];

    let current = start;
    while (current <= end) {
      if (current.getDay() === dayOfWeek) dates.push(format(current, 'yyyy-MM-dd'));
      current = addDays(current, 1);
    }

    const created: Row[] = [];
    const skipped: { date: string; reason: string }[] = [];

    for (const date of dates) {
      const avail = await checkAvailability({ teacherId, date, startTime, endTime });
      if (!avail.available) {
        skipped.push({ date, reason: avail.reason ?? 'Indisponível' });
        continue;
      }

      const appointment = await db.appointment.create({
        data: {
          teacher_id:         teacherId,
          student_id:         studentId  || null,
          class_id:           classId    || null,
          date,
          day_of_week:        dayOfWeek,
          start_time:         startTime,
          end_time:           endTime,
          status:             'confirmed',
          recurring_group_id: recurringGroupId,
          booking_type:       'recurring',
          notes:              notes || '',
        },
      });
      created.push(appointment);
    }

    return NextResponse.json(
      { recurringGroupId, appointments: created, count: created.length, skipped },
      { status: 201 }
    );
  } catch (error) {
    console.error('[appointments/recurring POST]', error);
    return NextResponse.json({ error: 'Erro ao criar agendamentos recorrentes' }, { status: 500 });
  }
}
