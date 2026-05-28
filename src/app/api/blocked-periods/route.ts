import { NextRequest, NextResponse } from 'next/server';
import { all, run } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];

    if (teacherId) { conditions.push('teacher_id = ?'); params.push(teacherId); }

    const blockedPeriods = all(`SELECT * FROM blocked_periods WHERE ${conditions.join(' AND ')} ORDER BY start_date ASC`, params);
    return NextResponse.json({ blockedPeriods });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar períodos bloqueados' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { teacherId, startDate, endDate, reason } = body as { teacherId: string; startDate: string; endDate: string; reason?: string };
    if (!teacherId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }
    const id = randomUUID();
    run('INSERT INTO blocked_periods (id, teacher_id, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)', [id, teacherId, startDate, endDate, reason || null]);
    const blockedPeriod = { id, teacher_id: teacherId, start_date: startDate, end_date: endDate, reason: reason || null };
    return NextResponse.json({ blockedPeriod }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar período bloqueado' }, { status: 500 });
  }
}
