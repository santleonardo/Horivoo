import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { format } from 'date-fns';

export async function GET() {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(format(d, 'yyyy-MM-dd'));
    }

    const [
      totalTeachers,
      totalStudents,
      totalBookings,
      todayBookings,
      weekBookings,
      upcomingBookings,
    ] = await Promise.all([
      db.teacher.count(),
      db.student.count(),
      db.booking.count({ where: { status: 'confirmed' } }),
      db.booking.count({ where: { date: today, status: 'confirmed' } }),
      db.booking.count({ where: { date: { in: weekDates }, status: 'confirmed' } }),
      db.booking.findMany({
        where: { date: { gte: today }, status: 'confirmed' },
        include: { teacher: true },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        take: 5,
      }),
    ]);

    return NextResponse.json({
      totalTeachers,
      totalStudents,
      totalBookings,
      todayBookings,
      weekBookings,
      upcomingBookings: upcomingBookings.map(b => ({
        id: b.id,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        studentName: b.studentName,
        teacherName: b.teacher.name,
        status: b.status,
      })),
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
