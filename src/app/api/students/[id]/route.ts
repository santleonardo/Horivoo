import { NextRequest, NextResponse } from 'next/server';
import { run, get } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, phone } = body;

    run('UPDATE students SET name = ?, email = ?, phone = ? WHERE id = ?', [name, email, phone, id]);
    const student = get('SELECT * FROM students WHERE id = ?', [id]);

    return NextResponse.json({ student });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Erro ao atualizar aluno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    run('DELETE FROM students WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json({ error: 'Erro ao excluir aluno' }, { status: 500 });
  }
}
