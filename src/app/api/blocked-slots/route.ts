import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const date = searchParams.get('date');

    const where: Record<string, unknown> = {};
    if (teacherId) where.teacherId = teacherId;
    if (date) where.date = date;

    const blockedSlots = await db.blockedSlot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({ blockedSlots });
  } catch (error) {
    console.error('Error fetching blocked slots:', error);
    return NextResponse.json({ error: 'Erro ao buscar horários bloqueados' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacherId, date, startTime, endTime, reason } = body;

    if (!teacherId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const blockedSlot = await db.blockedSlot.create({
      data: { teacherId, date, startTime, endTime, reason: reason || null },
    });

    return NextResponse.json({ blockedSlot }, { status: 201 });
  } catch (error) {
    console.error('Error creating blocked slot:', error);
    return NextResponse.json({ error: 'Erro ao bloquear horário' }, { status: 500 });
  }
}
