import { NextRequest, NextResponse } from 'next/server';
import { run, get } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, subjects, bio } = body;

    run('UPDATE teachers SET name = ?, email = ?, subjects = ?, bio = ? WHERE id = ?', [name, email, subjects, bio, id]);
    const teacher = get('SELECT * FROM teachers WHERE id = ?', [id]);

    return NextResponse.json({ teacher });
  } catch (error) {
    console.error('Error updating teacher:', error);
    return NextResponse.json({ error: 'Erro ao atualizar professor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    run('DELETE FROM teachers WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    return NextResponse.json({ error: 'Erro ao excluir professor' }, { status: 500 });
  }
}
