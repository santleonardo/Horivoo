import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const teacher = await db.teacher.findUnique({
      where: { id },
      include: { availability: true },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    return NextResponse.json(teacher.availability);
  } catch (error) {
    console.error('Get availability error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only coordinator or the teacher themselves can set availability
    const { id } = await params;
    if (user.role !== 'coordinator' && (user.teacher?.id !== id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { slots } = body as { slots: { weekday: number; startTime: string; endTime: string }[] };

    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: 'Slots array is required' }, { status: 400 });
    }

    const teacher = await db.teacher.findUnique({ where: { id } });
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Delete all existing availability and create new ones
    await db.teacherAvailability.deleteMany({ where: { teacherId: id } });

    if (slots.length > 0) {
      await db.teacherAvailability.createMany({
        data: slots.map((slot) => ({
          teacherId: id,
          weekday: slot.weekday,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      });
    }

    const updatedTeacher = await db.teacher.findUnique({
      where: { id },
      include: { availability: true },
    });

    return NextResponse.json(updatedTeacher?.availability || []);
  } catch (error) {
    console.error('Set availability error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (user.role !== 'coordinator' && user.teacher?.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const teacher = await db.teacher.findUnique({ where: { id } });
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    await db.teacherAvailability.deleteMany({ where: { teacherId: id } });

    return NextResponse.json({ message: 'Availability cleared successfully' });
  } catch (error) {
    console.error('Clear availability error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
