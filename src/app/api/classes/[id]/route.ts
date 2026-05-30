/**
 * /api/classes/[id] — Update / Delete class
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
      return NextResponse.json({ error: 'Apenas coordenadores podem editar turmas' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json() as Row;
    const { name, subject, teacherId } = body;

    const updates: Row = { updated_at: new Date().toISOString() };
    if (name !== undefined)      updates['name'] = name;
    if (subject !== undefined)   updates['subject'] = subject;
    if (teacherId !== undefined) updates['teacher_id'] = teacherId;

    const cls = await db.class_.update({ where: { id }, data: updates });
    return NextResponse.json({ class: cls });
  } catch (error) {
    console.error('[classes/[id] PUT]', error);
    return NextResponse.json({ error: 'Erro ao atualizar turma' }, { status: 500 });
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
      return NextResponse.json({ error: 'Apenas coordenadores podem excluir turmas' }, { status: 403 });
    }

    const { id } = await params;
    // Delete class_students first
    await db.classStudent.delete({ where: { class_id: id } }).catch(() => {});
    await db.class_.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[classes/[id] DELETE]', error);
    return NextResponse.json({ error: 'Erro ao excluir turma' }, { status: 500 });
  }
}
