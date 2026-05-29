import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const where: Row = {};
    if (teacherId) where['teacher_id'] = teacherId;
    // db returns camelCase after toCamel
    const blockedPeriods = await db.blockedPeriod.findMany({ where, orderBy: { start_date: 'asc' } });
    return NextResponse.json({ blockedPeriods });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar períodos bloqueados' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Row;
    const { teacherId, startDate, endDate, reason } = body as { teacherId: string; startDate: string; endDate: string; reason?: string };
    if (!teacherId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }
    const blockedPeriod = await db.blockedPeriod.create({
      data: { teacher_id: teacherId, start_date: startDate, end_date: endDate, reason: reason || null },
    });
    return NextResponse.json({ blockedPeriod }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar período bloqueado' }, { status: 500 });
  }
}
