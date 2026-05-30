import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, notes, date, startTime, endTime } = body;

    const appointment = await db.appointment.findUnique({ where: { id } });
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    // Handle reschedule
    if (date || startTime || endTime) {
      const newDate = date || appointment.date;
      const newStartTime = startTime || appointment.startTime;
      const newEndTime = endTime || appointment.endTime;

      // If rescheduling, validate the new time
      if (date || startTime !== undefined || endTime !== undefined) {
        const dayOfWeek = new Date(newDate + 'T12:00:00').getDay();

        // Validate teacher availability for new time
        const availability = await db.teacherAvailability.findFirst({
          where: {
            teacherId: appointment.teacherId,
            weekday: dayOfWeek,
            startTime: { lte: newStartTime },
            endTime: { gte: newEndTime },
          },
        });

        if (!availability) {
          return NextResponse.json(
            { error: 'Teacher does not have availability on this day/time' },
            { status: 400 }
          );
        }

        // Check for conflicting appointments (excluding current one)
        const conflicting = await db.appointment.findFirst({
          where: {
            id: { not: id },
            teacherId: appointment.teacherId,
            date: newDate,
            status: { not: 'cancelled' },
            startTime: { lt: newEndTime },
            endTime: { gt: newStartTime },
          },
        });

        if (conflicting) {
          return NextResponse.json(
            { error: 'Teacher has a conflicting appointment at this time' },
            { status: 409 }
          );
        }

        // Check holiday
        const holiday = await db.holiday.findFirst({ where: { date: newDate } });
        if (holiday) {
          return NextResponse.json(
            { error: `Date is a holiday: ${holiday.name}` },
            { status: 400 }
          );
        }

        // Check recess
        const recess = await db.recess.findFirst({
          where: {
            startDate: { lte: newDate },
            endDate: { gte: newDate },
          },
        });
        if (recess) {
          return NextResponse.json(
            { error: `Date falls within a recess period: ${recess.description}` },
            { status: 400 }
          );
        }
      }

      updateData.date = newDate;
      updateData.startTime = newStartTime;
      updateData.endTime = newEndTime;
    }

    const updatedAppointment = await db.appointment.update({
      where: { id },
      data: updateData,
      include: {
        class: true,
        teacher: {
          include: { user: true },
        },
        student: {
          include: { user: true },
        },
      },
    });

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error('Update appointment error:', error);
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
      return NextResponse.json({ error: 'Only coordinators can delete appointments' }, { status: 403 });
    }

    const { id } = await params;

    const appointment = await db.appointment.findUnique({ where: { id } });
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    await db.appointment.delete({ where: { id } });

    return NextResponse.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
