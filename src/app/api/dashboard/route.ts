import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { format } from 'date-fns';

export async function GET() {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekDates: string[] = [];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(format(d, 'yyyy-MM-dd'));
    }

    const [totalTeachers, totalStudents, totalBookings, todayBookings, weekBookings, upcoming] = await Promise.all([
      db.teacher.count(),
      db.student.count(),
      db.booking.count({ where: { status: 'confirmed' } }),
      db.booking.count({ where: { date: today, status: 'confirmed' } }),
      db.booking.count({ where: { date: { in: weekDates }, status: 'confirmed' } }),
      db.booking.findMany({ where: { date: { gte: today }, status: 'confirmed' }, orderBy: [{ date: 'asc' }, { start_time: 'asc' }], take: 5 }),
    ]);

    // Enrich upcoming with teacher names
    const teacherIds = [...new Set((upcoming as Record<string, unknown>[]).map(b => b.teacher_id as string))];
    const teachers = teacherIds.length ? await db.teacher.findMany({ where: { id: { in: teacherIds } } }) : [];
    const tMap = new Map((teachers as Record<string, unknown>[]).map(t => [t.id, t.name]));

    return NextResponse.json({
      totalTeachers,
      totalStudents,
      totalBookings,
      todayBookings,
      weekBookings,
      upcomingBookings: (upcoming as Record<string, unknown>[]).map(b => ({
        id: b.id,
        date: b.date,
        start_time: b.start_time,
        end_time: b.end_time,
        student_name: b.student_name,
        teacherName: tMap.get(b.teacher_id as string) || '',
        status: b.status,
      })),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
