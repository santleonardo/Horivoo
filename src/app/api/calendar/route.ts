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
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const teacherId = searchParams.get('teacherId');

    if (!year || !month) {
      return NextResponse.json(
        { error: 'year and month query params are required' },
        { status: 400 }
      );
    }

    // Calculate date range for the month
    const monthInt = parseInt(month, 10);
    const yearInt = parseInt(year, 10);

    const startDate = `${yearInt}-${String(monthInt).padStart(2, '0')}-01`;
    const lastDay = new Date(yearInt, monthInt, 0).getDate();
    const endDate = `${yearInt}-${String(monthInt).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Fetch appointments
    const appointmentWhere: Record<string, unknown> = {
      date: { gte: startDate, lte: endDate },
    };
    if (teacherId) appointmentWhere.teacherId = teacherId;

    const appointments = await db.appointment.findMany({
      where: appointmentWhere,
      include: {
        class: true,
        teacher: { include: { user: true } },
        student: { include: { user: true } },
      },
    });

    // Fetch holidays
    const holidays = await db.holiday.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
    });

    // Fetch recesses that overlap with the month
    const recesses = await db.recess.findMany({
      where: {
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate: { gte: startDate, lte: endDate } },
          { startDate: { lte: startDate }, endDate: { gte: endDate } },
        ],
      },
    });

    // Fetch tests
    const testWhere: Record<string, unknown> = {
      date: { gte: startDate, lte: endDate },
    };
    if (teacherId) {
      const teacherClasses = await db.class.findMany({
        where: { teacherId },
        select: { id: true },
      });
      testWhere.classId = { in: teacherClasses.map((c) => c.id) };
    }

    const tests = await db.test.findMany({
      where: testWhere,
      include: { class: true },
    });

    // Fetch make-up classes
    const makeUpClasses = await db.makeUpClass.findMany({
      where: {
        newDate: { gte: startDate, lte: endDate },
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

    return NextResponse.json({
      appointments,
      holidays,
      recesses,
      tests,
      makeUpClasses,
    });
  } catch (error) {
    console.error('Calendar error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
