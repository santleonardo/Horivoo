/**
 * /api/messages/route.ts
 * GET  → lista mensagens do usuário logado (inbox + sent)
 * POST → envia nova mensagem
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

type MsgRow = Record<string, unknown>;

async function getUser(req: NextRequest) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const box = searchParams.get('box') || 'inbox'; // inbox | sent

  try {
    const where = box === 'sent'
      ? { sender_id: user.userId }
      : { receiver_id: user.userId };

    const msgs = await db.message.findMany({
      where,
      orderBy: [{ created_at: 'desc' }],
    }) as MsgRow[];

    // Enrich with user names
    const userIds = new Set<string>();
    msgs.forEach(m => {
      if (m.sender_id)   userIds.add(m.sender_id as string);
      if (m.receiver_id) userIds.add(m.receiver_id as string);
    });

    const users = await db.user.findMany({
      where: { id: { in: Array.from(userIds) } },
    }) as MsgRow[];

    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const enriched = msgs.map(m => ({
      ...m,
      sender:   userMap[m.sender_id as string]   || { name: 'Desconhecido' },
      receiver: userMap[m.receiver_id as string] || { name: 'Desconhecido' },
    }));

    // Count unread in inbox
    const unread = box === 'inbox'
      ? enriched.filter(m => !m.read).length
      : 0;

    return NextResponse.json({ messages: enriched, unread });
  } catch (error) {
    console.error('[messages GET]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await req.json() as Record<string, string>;
    const { receiver_id, subject, body: msgBody } = body;

    if (!receiver_id || !msgBody?.trim()) {
      return NextResponse.json({ error: 'Destinatário e mensagem são obrigatórios' }, { status: 400 });
    }

    // Verify receiver exists
    const receiver = await db.user.findUnique({ where: { id: receiver_id } });
    if (!receiver) {
      return NextResponse.json({ error: 'Destinatário não encontrado' }, { status: 404 });
    }

    const msg = await db.message.create({
      data: {
        sender_id:   user.userId,
        receiver_id,
        subject:     subject || '',
        body:        msgBody.trim(),
        read:        false,
      },
    });

    return NextResponse.json({ message: msg }, { status: 201 });
  } catch (error) {
    console.error('[messages POST]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
