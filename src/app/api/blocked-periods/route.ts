import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    const where: Record<string, unknown> = {};
    if (teacherId) where.teacherId = teacherId;

    const blockedPeriods = await db.blockedPeriod.findMany({
      where,
      include: { teacher: true },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json({ blockedPeriods });
  } catch (error) {
    console.error('Error fetching blocked periods:', error);
    return NextResponse.json({ error: 'Erro ao buscar períodos bloqueados' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacherId, startDate, endDate, reason } = body;

    if (!teacherId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const blockedPeriod = await db.blockedPeriod.create({
      data: { teacherId, startDate, endDate, reason: reason || null },
    });

    return NextResponse.json({ blockedPeriod }, { status: 201 });
  } catch (error) {
    console.error('Error creating blocked period:', error);
    return NextResponse.json({ error: 'Erro ao criar período bloqueado' }, { status: 500 });
  }
}
