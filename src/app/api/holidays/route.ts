/**
 * /api/holidays — CRUD de feriados
 * GET: All authenticated users
 * POST: Only coordinator
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'coordinator', 'teacher', 'student');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    const where: Record<string, unknown> = {};
    if (year && month) {
      where.date = { startsWith: `${year}-${month.padStart(2, '0')}` };
    } else if (year) {
      where.date = { startsWith: year };
    }

    const holidays = await db.holiday.findMany({ where, orderBy: { date: 'asc' } });
    return NextResponse.json({ holidays });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json({ error: 'Erro ao buscar feriados' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only coordinator can create holidays
    const authResult = await requireRole(request, 'coordinator');
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { date, name, type, recurring } = body;

    if (!date || !name || !type) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const holiday = await db.holiday.create({
      data: { date, name, type, recurring: recurring || false },
    });

    return NextResponse.json({ holiday }, { status: 201 });
  } catch (error) {
    console.error('Error creating holiday:', error);
    return NextResponse.json({ error: 'Erro ao criar feriado' }, { status: 500 });
  }
}
