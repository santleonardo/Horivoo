import { NextRequest, NextResponse } from 'next/server';
import { all, get, run } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const slots = all('SELECT * FROM available_slots WHERE teacher_id = ? ORDER BY day_of_week ASC, start_time ASC', [id]);
    return NextResponse.json({ slots: slots.map(s => ({ id: s.id, dayOfWeek: s.day_of_week, startTime: s.start_time, endTime: s.end_time })) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar horários' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { dayOfWeek, startTime, endTime } = await request.json() as { dayOfWeek: number; startTime: string; endTime: string };
    if (dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }
    const slotId = randomUUID();
    try {
      run('INSERT INTO available_slots (id, teacher_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)', [slotId, id, dayOfWeek, startTime, endTime]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar horário';
      if (msg.includes('UNIQUE') || msg.includes('unique') || msg.includes('duplicate')) {
        return NextResponse.json({ error: 'Este horário já existe' }, { status: 400 });
      }
      throw err;
    }
    const slot = { id: slotId, teacher_id: id, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime };
    return NextResponse.json({ slot }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar horário' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slotId');
    if (!slotId) return NextResponse.json({ error: 'slotId é obrigatório' }, { status: 400 });
    run('DELETE FROM available_slots WHERE id = ? AND teacher_id = ?', [slotId, id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao remover horário' }, { status: 500 });
  }
}
