import { NextRequest, NextResponse } from 'next/server';
import { all, run } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const date = searchParams.get('date');

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];

    if (teacherId) { conditions.push('teacher_id = ?'); params.push(teacherId); }
    if (date) { conditions.push('date = ?'); params.push(date); }

    const blockedSlots = all(`SELECT * FROM blocked_slots WHERE ${conditions.join(' AND ')} ORDER BY date ASC, start_time ASC`, params);
    return NextResponse.json({ blockedSlots });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar horários bloqueados' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { teacherId, date, startTime, endTime, reason } = await request.json() as { teacherId: string; date: string; startTime: string; endTime: string; reason?: string };
    if (!teacherId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }
    const id = randomUUID();
    run('INSERT INTO blocked_slots (id, teacher_id, date, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?, ?)', [id, teacherId, date, startTime, endTime, reason || null]);
    const blockedSlot = { id, teacher_id: teacherId, date, start_time: startTime, end_time: endTime, reason: reason || null };
    return NextResponse.json({ blockedSlot }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao bloquear horário' }, { status: 500 });
  }
}
