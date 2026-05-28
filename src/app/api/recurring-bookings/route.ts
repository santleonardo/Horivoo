import { NextRequest, NextResponse } from 'next/server';
import { all, run } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];

    if (teacherId) { conditions.push('teacher_id = ?'); params.push(teacherId); }

    const recurringBookings = all(`SELECT * FROM recurring_bookings WHERE ${conditions.join(' AND ')} ORDER BY day_of_week ASC, start_time ASC`, params);

    // Enrich with teacher names
    const tIds = [...new Set(recurringBookings.map(r => r.teacher_id as string))];
    const tMap = new Map<string, Record<string, unknown>>();
    if (tIds.length) {
      const placeholders = tIds.map(() => '?').join(',');
      const teachers = all(`SELECT * FROM teachers WHERE id IN (${placeholders})`, tIds);
      teachers.forEach(t => tMap.set(t.id as string, t));
    }
    const enriched = recurringBookings.map(r => ({ ...r, teacher: tMap.get(r.teacher_id as string) || null }));

    return NextResponse.json({ recurringBookings: enriched });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar agendamentos recorrentes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { teacherId, studentName, studentEmail, dayOfWeek, startTime, endTime } = await request.json() as { teacherId: string; studentName: string; studentEmail?: string; dayOfWeek: number; startTime: string; endTime: string };
    if (!teacherId || !studentName || dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }
    const id = randomUUID();
    const active = 1;
    run('INSERT INTO recurring_bookings (id, teacher_id, student_name, student_email, day_of_week, start_time, end_time, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, teacherId, studentName, studentEmail || null, dayOfWeek, startTime, endTime, active]);
    const recurringBooking = { id, teacher_id: teacherId, student_name: studentName, student_email: studentEmail || null, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime, active: true };
    return NextResponse.json({ recurringBooking }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar agendamento recorrente' }, { status: 500 });
  }
}
