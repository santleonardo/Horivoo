import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const date = searchParams.get('date');
    const where: Row = {};
    if (teacherId) where.teacher_id = teacherId;
    if (date) where.date = date;
    const blockedSlots = await db.blockedSlot.findMany({ where, orderBy: [{ date: 'asc' }, { start_time: 'asc' }] });
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
    const blockedSlot = await db.blockedSlot.create({
      data: { teacher_id: teacherId, date, start_time: startTime, end_time: endTime, reason: reason || null },
    });
    return NextResponse.json({ blockedSlot }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao bloquear horário' }, { status: 500 });
  }
}
