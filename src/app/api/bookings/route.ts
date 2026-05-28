import { NextRequest, NextResponse } from 'next/server';
import { db, all, get, run } from '@/lib/db';
import { addDays, format, parse } from 'date-fns';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const studentProfileId = searchParams.get('studentProfileId');
    const date = searchParams.get('date');
    const weekStartStr = searchParams.get('weekStart');
    const status = searchParams.get('status');

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];

    if (teacherId) { conditions.push('b.teacher_id = ?'); params.push(teacherId); }
    if (studentProfileId) { conditions.push('b.student_profile_id = ?'); params.push(studentProfileId); }
    if (date) { conditions.push('b.date = ?'); params.push(date); }
    if (status) { conditions.push('b.status = ?'); params.push(status); }

    if (weekStartStr) {
      const weekStart = parse(weekStartStr, 'yyyy-MM-dd', new Date());
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) weekDates.push(format(addDays(weekStart, i), 'yyyy-MM-dd'));
      const placeholders = weekDates.map(() => '?').join(',');
      conditions.push(`b.date IN (${placeholders})`);
      params.push(...weekDates);
    }

    const bookings = all(`SELECT b.* FROM bookings b WHERE ${conditions.join(' AND ')} ORDER BY b.date ASC, b.start_time ASC`, params);

    // Enrich with teacher info
    const tIds = [...new Set(bookings.map(b => b.teacher_id as string))];
    const tMap = new Map<string, Record<string, unknown>>();
    if (tIds.length) {
      const placeholders = tIds.map(() => '?').join(',');
      const teachers = all(`SELECT * FROM teachers WHERE id IN (${placeholders})`, tIds);
      teachers.forEach(t => tMap.set(t.id as string, t));
    }
    const enriched = bookings.map(b => ({ ...b, teacher: tMap.get(b.teacher_id as string) || null }));

    return NextResponse.json({ bookings: enriched });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { teacherId: string; studentName: string; studentEmail?: string; date: string; startTime: string; endTime: string; studentProfileId?: string; notes?: string };
    const { teacherId, studentName, studentEmail, date, startTime, endTime, studentProfileId, notes } = body;

    if (!teacherId || !studentName || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const dayOfWeek = new Date(date + 'T12:00:00').getDay();

    // Check availability
    const avail = get('SELECT id FROM available_slots WHERE teacher_id = ? AND day_of_week = ? AND start_time = ? AND end_time = ?', [teacherId, dayOfWeek, startTime, endTime]);
    const existing = get('SELECT id FROM bookings WHERE teacher_id = ? AND date = ? AND start_time = ? AND status = ?', [teacherId, date, startTime, 'confirmed']);
    const blocked = get('SELECT id FROM blocked_slots WHERE teacher_id = ? AND date = ? AND start_time = ?', [teacherId, date, startTime]);
    const nonClass = get('SELECT id FROM non_class_days WHERE date = ?', [date]);
    const holiday = get('SELECT id FROM holidays WHERE date = ?', [date]);
    const recess = get('SELECT id FROM recesses WHERE start_date <= ? AND end_date >= ?', [date, date]);
    const blockedPeriod = get('SELECT id FROM blocked_periods WHERE teacher_id = ? AND start_date <= ? AND end_date >= ?', [teacherId, date, date]);

    if (!avail) return NextResponse.json({ error: 'Horário não disponível para este professor' }, { status: 400 });
    if (existing) return NextResponse.json({ error: 'Já existe agendamento neste horário' }, { status: 400 });
    if (blocked) return NextResponse.json({ error: 'Horário bloqueado' }, { status: 400 });
    if (nonClass) return NextResponse.json({ error: 'Dia sem aula' }, { status: 400 });
    if (holiday) return NextResponse.json({ error: 'Feriado' }, { status: 400 });
    if (recess) return NextResponse.json({ error: 'Período de recesso' }, { status: 400 });
    if (blockedPeriod) return NextResponse.json({ error: 'Professor indisponível nesta data' }, { status: 400 });

    const id = randomUUID();
    run(
      'INSERT INTO bookings (id, teacher_id, student_name, student_email, student_profile_id, date, day_of_week, start_time, end_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, teacherId, studentName, studentEmail || null, studentProfileId || null, date, dayOfWeek, startTime, endTime, 'confirmed', notes || '']
    );

    const booking = get('SELECT * FROM bookings WHERE id = ?', [id]);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 });
  }
}
