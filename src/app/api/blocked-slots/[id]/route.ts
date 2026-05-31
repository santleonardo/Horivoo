/**
 * /api/blocked-slots/[id] — Remove bloqueio pontual
 * DELETE: coordinator ou teacher (próprio)
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
    const auth = await requireRole(request, 'coordinator', 'teacher');
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    if (auth.role === 'teacher') {
      const teacher = await db.teacher.findUnique({ where: { user_id: auth.userId } });
      const slot    = await db.blockedSlot.findFirst({ where: { id } });
      if (!teacher || !slot) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
      if ((slot as Row)['teacherId'] !== (teacher as Row)['id']) {
        return NextResponse.json({ error: 'Acesso proibido' }, { status: 403 });
      }
    }

    await db.blockedSlot.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[blocked-slots/[id] DELETE]', error);
    return NextResponse.json({ error: 'Erro ao remover bloqueio' }, { status: 500 });
  }
}
