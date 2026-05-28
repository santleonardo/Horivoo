import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Row = Record<string, unknown>;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const slots = await db.availableSlot.findMany({ where: { teacher_id: id }, orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }] });
    return NextResponse.json({ slots: (slots as Row[]).map(s => ({ id: s.id, dayOfWeek: s.day_of_week, startTime: s.start_time, endTime: s.end_time })) });
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
    const slot = await db.availableSlot.create({ data: { teacher_id: id, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime } });
    return NextResponse.json({ slot }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao criar horário';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'Este horário já existe' }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slotId');
    if (!slotId) return NextResponse.json({ error: 'slotId é obrigatório' }, { status: 400 });
    await db.availableSlot.delete({ where: { id: slotId, teacher_id: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao remover horário' }, { status: 500 });
  }
}
