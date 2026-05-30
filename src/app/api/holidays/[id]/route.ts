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
      return NextResponse.json({ error: 'Only coordinators can update holidays' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, date } = body;

    const holiday = await db.holiday.findUnique({ where: { id } });
    if (!holiday) {
      return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
    }

    // If changing date, check for uniqueness
    if (date && date !== holiday.date) {
      const existing = await db.holiday.findUnique({ where: { date } });
      if (existing) {
        return NextResponse.json(
          { error: 'A holiday already exists on this date' },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (date !== undefined) updateData.date = date;

    const updatedHoliday = await db.holiday.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedHoliday);
  } catch (error) {
    console.error('Update holiday error:', error);
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
      return NextResponse.json({ error: 'Only coordinators can delete holidays' }, { status: 403 });
    }

    const { id } = await params;

    const holiday = await db.holiday.findUnique({ where: { id } });
    if (!holiday) {
      return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
    }

    await db.holiday.delete({ where: { id } });

    return NextResponse.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Delete holiday error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
