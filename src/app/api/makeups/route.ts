import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const makeUpClasses = await db.makeUpClass.findMany({
      include: {
        originalAppointment: {
          include: {
            class: true,
            teacher: { include: { user: true } },
            student: { include: { user: true } },
          },
        },
      },
      orderBy: { newDate: 'asc' },
    });

    return NextResponse.json(makeUpClasses);
  } catch (error) {
    console.error('List make-up classes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can create make-up classes' }, { status: 403 });
    }

    const body = await request.json();
    const { originalAppointmentId, newDate, newStartTime, newEndTime } = body;

    if (!originalAppointmentId || !newDate || !newStartTime || !newEndTime) {
      return NextResponse.json(
        { error: 'originalAppointmentId, newDate, newStartTime, and newEndTime are required' },
        { status: 400 }
      );
    }

    const appointment = await db.appointment.findUnique({
      where: { id: originalAppointmentId },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Original appointment not found' }, { status: 404 });
    }

    // Set original appointment status to cancelled
    await db.appointment.update({
      where: { id: originalAppointmentId },
      data: { status: 'cancelled' },
    });

    // Create make-up class
    const makeUpClass = await db.makeUpClass.create({
      data: {
        originalAppointmentId,
        newDate,
        newStartTime,
        newEndTime,
        status: 'scheduled',
      },
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

    return NextResponse.json(makeUpClass, { status: 201 });
  } catch (error) {
    console.error('Create make-up class error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
