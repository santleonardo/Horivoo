import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM

    const where: Record<string, unknown> = {};
    if (month) {
      where.date = { startsWith: month };
    }

    const nonClassDays = await db.nonClassDay.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ nonClassDays });
  } catch (error) {
    console.error('Error fetching non-class days:', error);
    return NextResponse.json({ error: 'Erro ao buscar dias sem aula' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, reason } = body;

    if (!date || !reason) {
      return NextResponse.json({ error: 'Data e motivo são obrigatórios' }, { status: 400 });
    }

    const existing = await db.nonClassDay.findUnique({ where: { date } });
    if (existing) {
      return NextResponse.json({ error: 'Já existe um dia sem aula nesta data' }, { status: 400 });
    }

    const nonClassDay = await db.nonClassDay.create({ data: { date, reason } });
    return NextResponse.json({ nonClassDay }, { status: 201 });
  } catch (error) {
    console.error('Error creating non-class day:', error);
    return NextResponse.json({ error: 'Erro ao criar dia sem aula' }, { status: 500 });
  }
}
