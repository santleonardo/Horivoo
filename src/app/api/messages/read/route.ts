/**
 * /api/messages/read/route.ts
 * PATCH → marca mensagem como lida
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  const user = await verifyToken(token);
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { messageId } = await req.json() as { messageId: string };
    if (!messageId) return NextResponse.json({ error: 'messageId obrigatório' }, { status: 400 });

    await db.message.update({
      where: { id: messageId, receiver_id: user.userId },
      data:  { read: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[messages PATCH]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
