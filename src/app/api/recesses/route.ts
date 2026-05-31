import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const recesses = await db.recess.findMany({ orderBy: { start_date: 'asc' } });
    return NextResponse.json({ recesses });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar recessos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, description } = await request.json() as { startDate: string; endDate: string; description: string };
    if (!startDate || !endDate || !description) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }
    if (startDate > endDate) {
      return NextResponse.json({ error: 'Data início deve ser anterior à data fim' }, { status: 400 });
    }
    const recess = await db.recess.create({ data: { start_date: startDate, end_date: endDate, description } });
    return NextResponse.json({ recess }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar recesso' }, { status: 500 });
  }
}
