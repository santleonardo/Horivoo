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
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');
    const studentId = searchParams.get('studentId');
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Record<string, unknown> = {};

    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;
    if (studentId) where.studentId = studentId;
    if (date) where.date = date;
    if (status) where.status = status;
    if (from || to) {
      const dateFilter: Record<string, string> = {};
      if (from) dateFilter.gte = from;
      if (to) dateFilter.lte = to;
      where.date = dateFilter;
    }

    const appointments = await db.appointment.findMany({
      where,
      include: {
        class: true,
        teacher: {
          include: { user: true },
        },
        student: {
          include: { user: true },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('List appointments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can create appointments' }, { status: 403 });
    }

    const body = await request.json();
    const { classId, teacherId, studentId, date, startTime, endTime, notes, recurringGroupId } = body;

    if (!classId || !teacherId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'classId, teacherId, date, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    // Validate teacher exists
    const teacher = await db.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Validate class exists
    const cls = await db.class.findUnique({ where: { id: classId } });
    if (!cls) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Get day of week for the date
    const dayOfWeek = new Date(date + 'T12:00:00').getDay();

    // Validate teacher has availability on that weekday/time
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

    // Check for conflicting appointments (same teacher, date, overlapping time)
    const conflicting = await db.appointment.findFirst({
      where: {
        teacherId,
        date,
        status: { not: 'cancelled' },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (conflicting) {
      return NextResponse.json(
        { error: 'Teacher has a conflicting appointment at this time' },
        { status: 409 }
      );
    }

    // Check if date is a holiday
    const holiday = await db.holiday.findFirst({
      where: { date },
    });

    if (holiday) {
      return NextResponse.json(
        { error: `Date is a holiday: ${holiday.name}` },
        { status: 400 }
      );
    }

    // Check if date falls within a recess period
    const recess = await db.recess.findFirst({
      where: {
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    if (recess) {
      return NextResponse.json(
        { error: `Date falls within a recess period: ${recess.description}` },
        { status: 400 }
      );
    }

    const appointment = await db.appointment.create({
      data: {
        classId,
        teacherId,
        studentId: studentId || null,
        date,
        startTime,
        endTime,
        recurringGroupId: recurringGroupId || null,
        notes: notes || '',
      },
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

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error('Create appointment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
