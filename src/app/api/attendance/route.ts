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
    const studentId = searchParams.get('studentId');
    const appointmentId = searchParams.get('appointmentId');

    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = studentId;
    if (appointmentId) where.appointmentId = appointmentId;

    const attendance = await db.attendance.findMany({
      where,
      include: {
        student: {
          include: { user: true },
        },
        appointment: {
          include: {
            class: true,
            teacher: { include: { user: true } },
          },
        },
      },
      orderBy: { appointment: { date: 'desc' } },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('List attendance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can create/update attendance' }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, appointmentId, status } = body;

    if (!studentId || !appointmentId || !status) {
      return NextResponse.json(
        { error: 'studentId, appointmentId, and status are required' },
        { status: 400 }
      );
    }

    // Verify student and appointment exist
    const student = await db.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const appointment = await db.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Upsert attendance record
    const attendance = await db.attendance.upsert({
      where: {
        studentId_appointmentId: { studentId, appointmentId },
      },
      update: { status },
      create: { studentId, appointmentId, status },
      include: {
        student: { include: { user: true } },
        appointment: {
          include: {
            class: true,
            teacher: { include: { user: true } },
          },
        },
      },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Create/update attendance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
