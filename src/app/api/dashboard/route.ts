/**
 * /api/dashboard — Estatísticas do sistema
 * Fonte única: appointments (nunca bookings)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { format } from 'date-fns';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'coordinator', 'teacher', 'student');
    if (authResult instanceof NextResponse) return authResult;

    const today = format(new Date(), 'yyyy-MM-dd');
    const weekDates: string[] = [];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(format(d, 'yyyy-MM-dd'));
    }

    const [
      totalTeachers,
      totalStudents,
      totalAppointments,
      totalClasses,
      todayAppointments,
      weekAppointments,
      upcoming,
      upcomingTests,
    ] = await Promise.all([
      db.teacher.count(),
      db.student.count(),
      db.appointment.count({ where: { status: 'confirmed' } }),
      db.class_.count(),
      db.appointment.count({ where: { date: today, status: 'confirmed' } }),
      db.appointment.count({ where: { date: { in: weekDates }, status: 'confirmed' } }),
      db.appointment.findMany({
        where: { date: { gte: today }, status: 'confirmed' },
        orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
        take: 5,
      }),
      db.test.findMany({ where: { date: { gte: today } }, orderBy: { date: 'asc' }, take: 5 }),
    ]);

    const teacherIds = [...new Set((upcoming as Row[]).map(a => a['teacherId'] as string))];
    const teachers = teacherIds.length
      ? await db.teacher.findMany({ where: { id: { in: teacherIds } } })
      : [];
    const tMap = new Map((teachers as Row[]).map(t => [t['id'], t['name']]));

    const testClassIds = [...new Set((upcomingTests as Row[]).map(t => t['classId'] as string).filter(Boolean))];
    const testClasses = testClassIds.length
      ? await db.class_.findMany({ where: { id: { in: testClassIds } } })
      : [];
    const cMap = new Map((testClasses as Row[]).map(c => [c['id'], c['name']]));

    const enrichedTests = (upcomingTests as Row[]).map(t => ({
      id: t['id'], title: t['title'], date: t['date'],
      classId: t['classId'], className: cMap.get(t['classId'] as string) || '',
    }));

    // Per-teacher stats
    const allTeachers = await db.teacher.findMany({});
    const teacherStats = await Promise.all(
      (allTeachers as Row[]).map(async (t) => {
        const tid = t['id'] as string;
        const teacherClasses = await db.class_.findMany({ where: { teacher_id: tid }, select: ['id'] });
        const [classesCount, studentsCount, upcomingCount] = await Promise.all([
          Promise.resolve(teacherClasses.length),
          db.classStudent.count({ where: { class_id: { in: (teacherClasses as Row[]).map(c => c['id']) } } }),
          db.appointment.count({ where: { teacher_id: tid, date: { gte: today }, status: 'confirmed' } }),
        ]);
        return {
          id: tid, name: t['name'], email: t['email'],
          classesCount, studentsCount, upcomingAppointmentsCount: upcomingCount,
        };
      })
    );

    return NextResponse.json({
      totalTeachers,
      totalStudents,
      totalAppointments,
      totalClasses,
      todayAppointments,
      weekAppointments,
      upcomingAppointments: (upcoming as Row[]).map(a => ({
        id: a['id'], date: a['date'],
        startTime: a['startTime'], endTime: a['endTime'],
        studentId: a['studentId'],
        teacherName: tMap.get(a['teacherId'] as string) || '',
        status: a['status'],
      })),
      upcomingTests: enrichedTests,
      teacherStats,
    });
  } catch (error) {
    console.error('[dashboard GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
