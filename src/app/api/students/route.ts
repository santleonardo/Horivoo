/**
 * /api/students — CRUD de alunos
 * Updated: email is now optional; phone and responsible_name are required
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const students = await db.student.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Erro ao buscar alunos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, responsibleName, email, notes, userId } = body;

    // Required fields: name, phone, responsibleName
    if (!name || !phone || !responsibleName) {
      return NextResponse.json(
        { error: 'Nome, telefone e nome do responsável são obrigatórios' },
        { status: 400 }
      );
    }

    const student = await db.student.create({
      data: {
        name,
        email: email || null,
        phone,
        responsible_name: responsibleName,
        notes: notes || '',
        user_id: userId || '',
      },
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Erro ao criar aluno' }, { status: 500 });
  }
}
