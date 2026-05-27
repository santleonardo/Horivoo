import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const slots = await db.availableSlot.findMany({
      where: { teacherId: id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({
      slots: slots.map(s => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json({ error: 'Erro ao buscar horários' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { dayOfWeek, startTime, endTime } = body;

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }

    const slot = await db.availableSlot.create({
      data: { teacherId: id, dayOfWeek, startTime, endTime },
    });

    return NextResponse.json({ slot }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao criar horário';
    if (msg.includes('Unique')) {
      return NextResponse.json({ error: 'Este horário já existe' }, { status: 400 });
    }
    console.error('Error creating available slot:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slotId');

    if (!slotId) {
      // Try to get from body as fallback
      try {
        const body = await request.json();
        const bodySlotId = body.slotId;
        if (!bodySlotId) {
          return NextResponse.json({ error: 'slotId é obrigatório' }, { status: 400 });
        }
        await db.availableSlot.delete({ where: { id: bodySlotId, teacherId: id } });
        return NextResponse.json({ ok: true });
      } catch {
        return NextResponse.json({ error: 'slotId é obrigatório' }, { status: 400 });
      }
    }

    await db.availableSlot.delete({ where: { id: slotId, teacherId: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting available slot:', error);
    return NextResponse.json({ error: 'Erro ao remover horário' }, { status: 500 });
  }
}
