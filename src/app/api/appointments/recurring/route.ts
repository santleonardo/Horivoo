/**
 * /api/appointments/recurring — Create recurring appointments
 * POST: Only coordinator
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
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

    // Generate recurring_group_id
    const recurringGroupId = crypto.randomUUID();

    // Generate dates for the dayOfWeek between startDate and endDate
    const start = parse(startDate, 'yyyy-MM-dd', new Date());
    const end = parse(endDate, 'yyyy-MM-dd', new Date());
    const dates: string[] = [];

    let current = start;
    while (current <= end) {
      if (current.getDay() === dayOfWeek) {
        dates.push(format(current, 'yyyy-MM-dd'));
      }
      current = addDays(current, 1);
    }

    // Create appointments for each date
    const created: Row[] = [];
    for (const date of dates) {
      // Check for holidays/recesses
      const [holiday, recess] = await Promise.all([
        db.holiday.findFirst({ where: { date } }),
        db.recess.findFirst({ where: { start_date: { lte: date }, end_date: { gte: date } } }),
      ]);

      if (holiday || recess) continue; // Skip holidays/recesses

      const data: Row = {
        teacher_id: teacherId,
        student_id: studentId || null,
        class_id: classId || null,
        date,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
        recurring_group_id: recurringGroupId,
        notes: notes || '',
      };

      const appointment = await db.appointment.create({ data });
      created.push(appointment);
    }

    return NextResponse.json({ recurringGroupId, appointments: created, count: created.length }, { status: 201 });
  } catch (error) {
    console.error('[appointments/recurring POST]', error);
    return NextResponse.json({ error: 'Erro ao criar agendamentos recorrentes' }, { status: 500 });
  }
}
