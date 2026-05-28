import { NextRequest, NextResponse } from 'next/server';
import { all, get, run } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];

    if (month) {
      conditions.push("date LIKE ?");
      params.push(`${month}%`);
    }

    const nonClassDays = all(`SELECT * FROM non_class_days WHERE ${conditions.join(' AND ')} ORDER BY date ASC`, params);
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

    const existing = get('SELECT id FROM non_class_days WHERE date = ?', [date]);
    if (existing) {
      return NextResponse.json({ error: 'Já existe um dia sem aula nesta data' }, { status: 400 });
    }

    const id = randomUUID();
    run('INSERT INTO non_class_days (id, date, reason) VALUES (?, ?, ?)', [id, date, reason]);
    const nonClassDay = { id, date, reason };

    return NextResponse.json({ nonClassDay }, { status: 201 });
  } catch (error) {
    console.error('Error creating non-class day:', error);
    return NextResponse.json({ error: 'Erro ao criar dia sem aula' }, { status: 500 });
  }
}
