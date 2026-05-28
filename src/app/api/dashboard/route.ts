import { NextResponse } from 'next/server';
import { all, get } from '@/lib/db';
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

    const totalTeachers = (get<{ count: number }>('SELECT COUNT(*) as count FROM teachers')?.count) ?? 0;
    const totalStudents = (get<{ count: number }>('SELECT COUNT(*) as count FROM students')?.count) ?? 0;
    const totalBookings = (get<{ count: number }>('SELECT COUNT(*) as count FROM bookings WHERE status = ?', ['confirmed'])?.count) ?? 0;
    const todayBookings = (get<{ count: number }>('SELECT COUNT(*) as count FROM bookings WHERE date = ? AND status = ?', [today, 'confirmed'])?.count) ?? 0;

    const weekPlaceholders = weekDates.map(() => '?').join(',');
    const weekBookings = (get<{ count: number }>(`SELECT COUNT(*) as count FROM bookings WHERE date IN (${weekPlaceholders}) AND status = ?`, [...weekDates, 'confirmed'])?.count) ?? 0;

    const upcoming = all(`SELECT * FROM bookings WHERE date >= ? AND status = ? ORDER BY date ASC, start_time ASC LIMIT 5`, [today, 'confirmed']);

    // Enrich upcoming with teacher names
    const teacherIds = [...new Set(upcoming.map(b => b.teacher_id as string))];
    const tMap = new Map<string, string>();
    if (teacherIds.length) {
      const placeholders = teacherIds.map(() => '?').join(',');
      const teachers = all(`SELECT id, name FROM teachers WHERE id IN (${placeholders})`, teacherIds);
      teachers.forEach(t => tMap.set(t.id as string, t.name as string));
    }

    return NextResponse.json({
      totalTeachers,
      totalStudents,
      totalBookings,
      todayBookings,
      weekBookings,
      upcomingBookings: upcoming.map(b => ({
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
