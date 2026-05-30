import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can create recurring appointments' }, { status: 403 });
    }

    const body = await request.json();
    const { classId, teacherId, studentId, dayOfWeek, startTime, endTime, startDate, endDate, notes } = body;

    if (!classId || !teacherId || !dayOfWeek === undefined || !startTime || !endTime || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'classId, teacherId, dayOfWeek, startTime, endTime, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    // Validate teacher and class
    const teacher = await db.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const cls = await db.class.findUnique({ where: { id: classId } });
    if (!cls) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Validate teacher availability on the specified day of week
    const availability = await db.teacherAvailability.findFirst({
      where: {
        teacherId,
        weekday: dayOfWeek,
        startTime: { lte: startTime },
        endTime: { gte: endTime },
      },
    });

    if (!availability) {
      return NextResponse.json(
        { error: 'Teacher does not have availability on this day/time' },
        { status: 400 }
      );
    }

    const recurringGroupId = crypto.randomUUID();
    const createdAppointments = [];
    const skippedDates: string[] = [];
    const errors: string[] = [];

    // Generate dates from startDate to endDate on the specified dayOfWeek
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    const current = new Date(start);

    // Adjust to the first occurrence of the target day of week
    while (current.getDay() !== dayOfWeek) {
      current.setDate(current.getDate() + 1);
    }

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];

      // Check holiday
      const holiday = await db.holiday.findFirst({ where: { date: dateStr } });
      if (holiday) {
        skippedDates.push(dateStr);
        errors.push(`${dateStr} is a holiday: ${holiday.name}`);
        current.setDate(current.getDate() + 7);
        continue;
      }

      // Check recess
      const recess = await db.recess.findFirst({
        where: {
          startDate: { lte: dateStr },
          endDate: { gte: dateStr },
        },
      });
      if (recess) {
        skippedDates.push(dateStr);
        errors.push(`${dateStr} falls within recess: ${recess.description}`);
        current.setDate(current.getDate() + 7);
        continue;
      }

      // Check for conflicting appointments
      const conflicting = await db.appointment.findFirst({
        where: {
          teacherId,
          date: dateStr,
          status: { not: 'cancelled' },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (conflicting) {
        skippedDates.push(dateStr);
        errors.push(`${dateStr} has a conflicting appointment`);
        current.setDate(current.getDate() + 7);
        continue;
      }

      const appointment = await db.appointment.create({
        data: {
          classId,
          teacherId,
          studentId: studentId || null,
          date: dateStr,
          startTime,
          endTime,
          recurringGroupId,
          notes: notes || '',
        },
        include: {
          class: true,
          teacher: { include: { user: true } },
          student: { include: { user: true } },
        },
      });

      createdAppointments.push(appointment);
      current.setDate(current.getDate() + 7);
    }

    return NextResponse.json({
      recurringGroupId,
      created: createdAppointments.length,
      skipped: skippedDates.length,
      skippedDates,
      errors: errors.length > 0 ? errors : undefined,
      appointments: createdAppointments,
    }, { status: 201 });
  } catch (error) {
    console.error('Create recurring appointments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can cancel recurring appointments' }, { status: 403 });
    }

    const body = await request.json();
    const { recurringGroupId, cancelAll, specificDate } = body;

    if (!recurringGroupId) {
      return NextResponse.json({ error: 'recurringGroupId is required' }, { status: 400 });
    }

    if (cancelAll) {
      // Cancel all future appointments in the group
      const today = new Date().toISOString().split('T')[0];
      const result = await db.appointment.updateMany({
        where: {
          recurringGroupId,
          date: { gte: today },
          status: { not: 'cancelled' },
        },
        data: { status: 'cancelled' },
      });

      return NextResponse.json({
        message: `Cancelled ${result.count} future appointments`,
        cancelledCount: result.count,
      });
    }

    if (specificDate) {
      // Cancel only the specific occurrence
      const result = await db.appointment.updateMany({
        where: {
          recurringGroupId,
          date: specificDate,
          status: { not: 'cancelled' },
        },
        data: { status: 'cancelled' },
      });

      return NextResponse.json({
        message: `Cancelled ${result.count} appointment on ${specificDate}`,
        cancelledCount: result.count,
      });
    }

    return NextResponse.json(
      { error: 'Either cancelAll or specificDate must be provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Cancel recurring appointments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
