import { NextRequest, NextResponse } from 'next/server';
import { all, run } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const students = all('SELECT * FROM students ORDER BY name ASC');
    return NextResponse.json({
      students: students.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        user_id: s.user_id,
        created_at: s.created_at,
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

    const id = randomUUID();
    run('INSERT INTO students (id, name, email, phone, user_id) VALUES (?, ?, ?, ?, ?)', [id, name, email, phone || '', userId || '']);
    const student = { id, name, email, phone: phone || '', user_id: userId || '' };

    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Erro ao criar aluno' }, { status: 500 });
  }
}
