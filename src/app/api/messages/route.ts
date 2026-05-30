import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const box = searchParams.get('box') || 'inbox';

    let where: Record<string, unknown>;
    if (box === 'sent') {
      where = { senderId: user.userId };
    } else {
      where = { receiverId: user.userId };
    }

    const messages = await db.message.findMany({
      where,
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true },
        },
        receiver: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('List messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { receiverId, subject, body: messageBody } = body;

    if (!receiverId || !messageBody) {
      return NextResponse.json(
        { error: 'receiverId and body are required' },
        { status: 400 }
      );
    }

    const receiver = await db.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
    }

    const message = await db.message.create({
      data: {
        sender: { connect: { id: user.userId } },
        receiver: { connect: { id: receiverId } },
        subject: subject || '',
        body: messageBody,
      },
    });

    // Fetch with relations
    const fullMessage = await db.message.findUnique({
      where: { id: message.id },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true },
        },
        receiver: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return NextResponse.json(fullMessage, { status: 201 });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
