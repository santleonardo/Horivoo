import { NextRequest, NextResponse } from 'next/server';
import { all, run } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const recesses = all('SELECT * FROM recesses ORDER BY start_date ASC');
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
    const id = randomUUID();
    run('INSERT INTO recesses (id, start_date, end_date, description) VALUES (?, ?, ?, ?)', [id, startDate, endDate, description]);
    const recess = { id, start_date: startDate, end_date: endDate, description };
    return NextResponse.json({ recess }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar recesso' }, { status: 500 });
  }
}
