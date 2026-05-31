/**
 * /api/teachers/[id] — Update / Delete teacher
 * PUT / DELETE: coordinator only
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, 'coordinator');
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const body = await request.json();
    const { name, email, subjects, bio } = body;

    const teacher = await db.teacher.update({
      where: { id },
      data: { name, email, subjects, bio },
    });

    return NextResponse.json({ teacher });
  } catch (error) {
    console.error('[teachers/[id] PUT]', error);
    return NextResponse.json({ error: 'Erro ao atualizar professor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, 'coordinator');
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    await db.teacher.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[teachers/[id] DELETE]', error);
    return NextResponse.json({ error: 'Erro ao excluir professor' }, { status: 500 });
  }
}
