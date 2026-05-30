/**
 * /api/blocked-periods/[id] — Delete blocked period
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

    // Teachers can only delete their own blocked periods
    if (authResult.role === 'teacher') {
      const period = await db.blockedPeriod.findUnique({ where: { id } });
      if (!period) return NextResponse.json({ error: 'Período não encontrado' }, { status: 404 });
      const teacher = await db.teacher.findUnique({ where: { user_id: authResult.userId } });
      if (!teacher || (period as Row)['teacherId'] !== (teacher as Row)['id']) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
      }
    }

    await db.blockedPeriod.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blocked period:', error);
    return NextResponse.json({ error: 'Erro ao excluir período bloqueado' }, { status: 500 });
  }
}
