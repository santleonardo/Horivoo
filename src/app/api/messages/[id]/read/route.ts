/**
 * /api/messages/[id]/read — Mark message as read
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;

    // Verify the user is the receiver
    const message = await db.message.findUnique({ where: { id } });
    if (!message) {
      return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 });
    }

    // Only the receiver can mark as read
    if ((message as Record<string, unknown>)['receiverId'] !== user.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    await db.message.update({ where: { id }, data: { read: true } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[messages/[id]/read PATCH]', error);
    return NextResponse.json({ error: 'Erro ao marcar mensagem como lida' }, { status: 500 });
  }
}
