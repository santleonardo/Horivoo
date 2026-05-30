/**
 * /api/dashboard — Estatísticas do dashboard
 * Queries otimizadas: sem N+1; contagens de turmas e alunos por professor
 * são obtidas em lote e agrupadas em memória.
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
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(format(d, 'yyyy-MM-dd'));
    }

    // Fase 1: contagens e listas base — tudo em paralelo
    const [
      totalTeachers,
      totalStudents,
      totalBookings,
      totalClasses,
      todayBookings,
      weekBookings,
      upcoming,
      upcomingTests,
      allTeachers,
      allClasses,
      allClassStudents,
      futureBookingsByTeacher,
    ] = await Promise.all([
      db.teacher.count(),
      db.student.count(),
      db.booking.count({ where: { status: 'confirmed' } }),
      db.class_.count(),
      db.booking.count({ where: { date: today, status: 'confirmed' } }),
      db.booking.count({ where: { date: { in: weekDates }, status: 'confirmed' } }),
      db.booking.findMany({
        where: { date: { gte: today }, status: 'confirmed' },
        orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
        take: 5,
      }),
      db.test.findMany({ where: { date: { gte: today } }, orderBy: { date: 'asc' }, take: 5 }),
      db.teacher.findMany({}),
      db.class_.findMany({}),
      db.classStudent.findMany({}),
      db.booking.findMany({
        where: { date: { gte: today }, status: 'confirmed' },
        select: ['teacher_id'],
      }),
    ]);

    // Fase 2: enrich upcoming bookings com nome do professor
    const tIds = [...new Set((upcoming as Row[]).map(b => b['teacherId'] as string))];
    const tList = tIds.length ? await db.teacher.findMany({ where: { id: { in: tIds } } }) : [];
    const tMap  = new Map((tList as Row[]).map(t => [t['id'], t['name']]));

    // Fase 3: enrich upcoming tests com nome da turma
    const testClassIds = [...new Set((upcomingTests as Row[]).map(t => t['classId'] as string).filter(Boolean))];
    const testClasses  = testClassIds.length ? await db.class_.findMany({ where: { id: { in: testClassIds } } }) : [];
    const cMap         = new Map((testClasses as Row[]).map(c => [c['id'], c['name']]));

    const enrichedTests = (upcomingTests as Row[]).map(t => ({
      id:        t['id'],
      title:     t['title'],
      date:      t['date'],
      classId:   t['classId'],
      className: cMap.get(t['classId'] as string) || '',
    }));

    // Fase 4: agrupar turmas, alunos e agendamentos futuros por professor em memória
    const classesByTeacher = new Map<string, number>();
    for (const c of allClasses as Row[]) {
      const tid = c['teacherId'] as string;
      classesByTeacher.set(tid, (classesByTeacher.get(tid) || 0) + 1);
    }

    const classIds         = new Set((allClasses as Row[]).map(c => c['id'] as string));
    const studentsByTeacher = new Map<string, Set<string>>();
    for (const cs of allClassStudents as Row[]) {
      const cid = cs['classId'] as string;
      // find teacher for this class
      const cls = (allClasses as Row[]).find(c => c['id'] === cid);
      if (!cls) continue;
      const tid = cls['teacherId'] as string;
      if (!studentsByTeacher.has(tid)) studentsByTeacher.set(tid, new Set());
      studentsByTeacher.get(tid)!.add(cs['studentId'] as string);
    }

    const upcomingByTeacher = new Map<string, number>();
    for (const b of futureBookingsByTeacher as Row[]) {
      const tid = (b['teacherId'] || b['teacher_id']) as string;
      upcomingByTeacher.set(tid, (upcomingByTeacher.get(tid) || 0) + 1);
    }

    const teacherStats = (allTeachers as Row[]).map(t => ({
      id:              t['id'],
      name:            t['name'],
      email:           t['email'],
      classesCount:    classesByTeacher.get(t['id'] as string) || 0,
      studentsCount:   studentsByTeacher.get(t['id'] as string)?.size || 0,
      upcomingBookings: upcomingByTeacher.get(t['id'] as string) || 0,
    }));

    return NextResponse.json({
      totalTeachers,
      totalStudents,
      totalBookings,
      totalClasses,
      todayBookings,
      weekBookings,
      upcomingBookings: (upcoming as Row[]).map(b => ({
        id:          b['id'],
        date:        b['date'],
        startTime:   b['startTime'],
        endTime:     b['endTime'],
        studentName: b['studentName'],
        teacherName: tMap.get(b['teacherId'] as string) || '',
        status:      b['status'],
      })),
      upcomingTests: enrichedTests,
      teacherStats,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
