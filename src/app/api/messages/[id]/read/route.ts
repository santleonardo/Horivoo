import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const message = await db.message.findUnique({ where: { id } });
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Only the receiver can mark a message as read
    if (message.receiverId !== user.userId) {
      return NextResponse.json({ error: 'You can only mark your own messages as read' }, { status: 403 });
    }

    const updatedMessage = await db.message.update({
      where: { id },
      data: { read: true },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true },
        },
        receiver: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error('Mark message read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
