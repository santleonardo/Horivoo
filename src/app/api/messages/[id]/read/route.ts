/**
 * /api/messages/[id]/read — Mark message as read
 * PATCH: Verify receiver is the authenticated user
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, 'coordinator', 'teacher', 'student');
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;

    // Verify the message exists
    const message = await db.message.findUnique({ where: { id } });
    if (!message) {
      return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 });
    }

    // Only the receiver can mark as read
    if ((message as Record<string, unknown>)['receiverId'] !== authResult.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    await db.message.update({ where: { id }, data: { read: true } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[messages/[id]/read PATCH]', error);
    return NextResponse.json({ error: 'Erro ao marcar mensagem como lida' }, { status: 500 });
  }
}
