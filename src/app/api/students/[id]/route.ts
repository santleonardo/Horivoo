/**
 * /api/students/[id] — Update / Delete student
 * Updated: email is now optional; phone and responsible_name are required
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

type Row = Record<string, unknown>;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, responsibleName, notes } = body;

    const data: Row = { updated_at: new Date().toISOString() };
    if (name !== undefined) data['name'] = name;
    if (email !== undefined) data['email'] = email || null;
    if (phone !== undefined) data['phone'] = phone;
    if (responsibleName !== undefined) data['responsible_name'] = responsibleName;
    if (notes !== undefined) data['notes'] = notes;

    const student = await db.student.update({
      where: { id },
      data,
    });

    return NextResponse.json({ student });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Erro ao atualizar aluno' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    await db.student.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json({ error: 'Erro ao excluir aluno' }, { status: 500 });
  }
}
