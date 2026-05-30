/**
 * /api/tests/[id] — Update / Delete test
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

    if (user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Apenas coordenadores podem editar provas' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json() as Row;
    const { title, date, classId } = body;

    const updates: Row = {};
    if (title !== undefined)   updates['title'] = title;
    if (date !== undefined)    updates['date'] = date;
    if (classId !== undefined) updates['class_id'] = classId;

    const test = await db.test.update({ where: { id }, data: updates });
    return NextResponse.json({ test });
  } catch (error) {
    console.error('[tests/[id] PUT]', error);
    return NextResponse.json({ error: 'Erro ao atualizar prova' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Apenas coordenadores podem excluir provas' }, { status: 403 });
    }

    const { id } = await params;
    await db.test.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[tests/[id] DELETE]', error);
    return NextResponse.json({ error: 'Erro ao excluir prova' }, { status: 500 });
  }
}
