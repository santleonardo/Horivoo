import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const recesses = await db.recess.findMany({
      orderBy: { startDate: 'asc' },
    });
    return NextResponse.json({ recesses });
  } catch (error) {
    console.error('Error fetching recesses:', error);
    return NextResponse.json({ error: 'Erro ao buscar recessos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, description } = body;

    if (!startDate || !endDate || !description) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }

    if (startDate > endDate) {
      return NextResponse.json({ error: 'Data início deve ser anterior à data fim' }, { status: 400 });
    }

    const recess = await db.recess.create({
      data: { startDate, endDate, description },
    });

    return NextResponse.json({ recess }, { status: 201 });
  } catch (error) {
    console.error('Error creating recess:', error);
    return NextResponse.json({ error: 'Erro ao criar recesso' }, { status: 500 });
  }
}
