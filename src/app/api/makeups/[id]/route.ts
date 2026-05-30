import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can update make-up classes' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, newDate, newStartTime, newEndTime } = body;

    const makeUpClass = await db.makeUpClass.findUnique({ where: { id } });
    if (!makeUpClass) {
      return NextResponse.json({ error: 'Make-up class not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (newDate !== undefined) updateData.newDate = newDate;
    if (newStartTime !== undefined) updateData.newStartTime = newStartTime;
    if (newEndTime !== undefined) updateData.newEndTime = newEndTime;

    const updatedMakeUp = await db.makeUpClass.update({
      where: { id },
      data: updateData,
      include: {
        originalAppointment: {
          include: {
            class: true,
            teacher: { include: { user: true } },
            student: { include: { user: true } },
          },
        },
      },
    });

    return NextResponse.json(updatedMakeUp);
  } catch (error) {
    console.error('Update make-up class error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can delete make-up classes' }, { status: 403 });
    }

    const { id } = await params;

    const makeUpClass = await db.makeUpClass.findUnique({ where: { id } });
    if (!makeUpClass) {
      return NextResponse.json({ error: 'Make-up class not found' }, { status: 404 });
    }

    await db.makeUpClass.delete({ where: { id } });

    return NextResponse.json({ message: 'Make-up class deleted successfully' });
  } catch (error) {
    console.error('Delete make-up class error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
