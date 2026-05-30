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
      return NextResponse.json({ error: 'Only coordinators can update tests' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { classId, title, date } = body;

    const test = await db.test.findUnique({ where: { id } });
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (classId) {
      const cls = await db.class.findUnique({ where: { id: classId } });
      if (!cls) {
        return NextResponse.json({ error: 'Class not found' }, { status: 404 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (classId !== undefined) updateData.classId = classId;
    if (title !== undefined) updateData.title = title;
    if (date !== undefined) updateData.date = date;

    const updatedTest = await db.test.update({
      where: { id },
      data: updateData,
      include: { class: true },
    });

    return NextResponse.json(updatedTest);
  } catch (error) {
    console.error('Update test error:', error);
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
      return NextResponse.json({ error: 'Only coordinators can delete tests' }, { status: 403 });
    }

    const { id } = await params;

    const test = await db.test.findUnique({ where: { id } });
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    await db.test.delete({ where: { id } });

    return NextResponse.json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Delete test error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
