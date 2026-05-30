/**
 * /api/blocked-slots/[id] — Delete blocked slot
 * DELETE: Teacher (own) or coordinator
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';

type Row = Record<string, unknown>;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, 'coordinator', 'teacher');
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;

    // Teachers can only unblock their own slots
    if (authResult.role === 'teacher') {
      const slot = await db.blockedSlot.findUnique({ where: { id } });
      if (!slot) return NextResponse.json({ error: 'Horário não encontrado' }, { status: 404 });
      const teacher = await db.teacher.findUnique({ where: { user_id: authResult.userId } });
      if (!teacher || (slot as Row)['teacherId'] !== (teacher as Row)['id']) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
      }
    }

    await db.blockedSlot.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting blocked slot:', error);
    return NextResponse.json({ error: 'Erro ao desbloquear horário' }, { status: 500 });
  }
}
