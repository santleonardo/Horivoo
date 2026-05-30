import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Count totals
    const [totalTeachers, totalStudents, totalClasses] = await Promise.all([
      db.teacher.count(),
      db.student.count(),
      db.class.count(),
    ]);

    // Appointments today
    const today = new Date().toISOString().split('T')[0];
    const totalAppointmentsToday = await db.appointment.count({
      where: {
        date: today,
        status: { not: 'cancelled' },
      },
    });

    // Upcoming appointments (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const upcomingAppointments = await db.appointment.findMany({
      where: {
        date: { gte: today, lte: nextWeekStr },
        status: { not: 'cancelled' },
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
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 20,
    });

    // Recent messages (last 5)
    const recentMessages = await db.message.findMany({
      where: { receiverId: user.userId },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      totalTeachers,
      totalStudents,
      totalClasses,
      totalAppointmentsToday,
      upcomingAppointments,
      recentMessages,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
