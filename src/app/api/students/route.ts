import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const students = await db.student.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      students: students.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        user_id: s.userId,
        created_at: s.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Erro ao buscar alunos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, userId } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 });
    }

    const student = await db.student.create({
      data: { name, email, phone: phone || '', user_id: userId || '' },
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Erro ao criar aluno' }, { status: 500 });
  }
}
