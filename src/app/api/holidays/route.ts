import { NextRequest, NextResponse } from 'next/server';
import { all, run } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];

    if (year && month) {
      conditions.push("date LIKE ?");
      params.push(`${year}-${month.padStart(2, '0')}%`);
    } else if (year) {
      conditions.push("date LIKE ?");
      params.push(`${year}%`);
    }

    const holidays = all(`SELECT * FROM holidays WHERE ${conditions.join(' AND ')} ORDER BY date ASC`, params);
    return NextResponse.json({ holidays });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json({ error: 'Erro ao buscar feriados' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, name, type, recurring } = body;

    if (!date || !name || !type) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const id = randomUUID();
    run('INSERT INTO holidays (id, date, name, type, recurring) VALUES (?, ?, ?, ?, ?)', [id, date, name, type, recurring ? 1 : 0]);
    const holiday = { id, date, name, type, recurring: !!recurring };

    return NextResponse.json({ holiday }, { status: 201 });
  } catch (error) {
    console.error('Error creating holiday:', error);
    return NextResponse.json({ error: 'Erro ao criar feriado' }, { status: 500 });
  }
}
