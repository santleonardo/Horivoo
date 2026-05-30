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
      return NextResponse.json({ error: 'Only coordinators can update recesses' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { startDate, endDate, description } = body;

    const recess = await db.recess.findUnique({ where: { id } });
    if (!recess) {
      return NextResponse.json({ error: 'Recess not found' }, { status: 404 });
    }

    const newStartDate = startDate || recess.startDate;
    const newEndDate = endDate || recess.endDate;

    if (newStartDate > newEndDate) {
      return NextResponse.json(
        { error: 'startDate must be before or equal to endDate' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (description !== undefined) updateData.description = description;

    const updatedRecess = await db.recess.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedRecess);
  } catch (error) {
    console.error('Update recess error:', error);
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
      return NextResponse.json({ error: 'Only coordinators can delete recesses' }, { status: 403 });
    }

    const { id } = await params;

    const recess = await db.recess.findUnique({ where: { id } });
    if (!recess) {
      return NextResponse.json({ error: 'Recess not found' }, { status: 404 });
    }

    await db.recess.delete({ where: { id } });

    return NextResponse.json({ message: 'Recess deleted successfully' });
  } catch (error) {
    console.error('Delete recess error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
