import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can export data' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json({ error: 'type query param is required' }, { status: 400 });
    }

    let csvContent = '';
    let filename = '';

    switch (type) {
      case 'appointments': {
        const appointments = await db.appointment.findMany({
          include: {
            class: true,
            teacher: { include: { user: true } },
            student: { include: { user: true } },
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        });

        const headers = ['ID', 'Date', 'Start Time', 'End Time', 'Status', 'Class', 'Subject', 'Teacher', 'Student', 'Notes'];
        const rows = appointments.map((a) => [
          a.id,
          a.date,
          a.startTime,
          a.endTime,
          a.status,
          a.class.name,
          a.class.subject,
          a.teacher.user.name,
          a.student?.user?.name || '',
          a.notes,
        ].map(escapeCSV).join(','));

        csvContent = [headers.join(','), ...rows].join('\n');
        filename = 'appointments.csv';
        break;
      }

      case 'students': {
        const students = await db.student.findMany({
          include: {
            user: true,
            classStudents: { include: { class: true } },
          },
          orderBy: { user: { name: 'asc' } },
        });

        const headers = ['ID', 'Name', 'Email', 'Phone', 'Responsible Name', 'Notes', 'Classes'];
        const rows = students.map((s) => [
          s.id,
          s.user.name,
          s.user.email,
          s.user.phone,
          s.responsibleName,
          s.notes,
          s.classStudents.map((cs) => cs.class.name).join('; '),
        ].map(escapeCSV).join(','));

        csvContent = [headers.join(','), ...rows].join('\n');
        filename = 'students.csv';
        break;
      }

      case 'teachers': {
        const teachers = await db.teacher.findMany({
          include: {
            user: true,
            classes: true,
          },
          orderBy: { user: { name: 'asc' } },
        });

        const headers = ['ID', 'Name', 'Email', 'Phone', 'Subjects', 'Bio', 'Classes'];
        const rows = teachers.map((t) => [
          t.id,
          t.user.name,
          t.user.email,
          t.user.phone,
          t.subjects,
          t.bio,
          t.classes.map((c) => c.name).join('; '),
        ].map(escapeCSV).join(','));

        csvContent = [headers.join(','), ...rows].join('\n');
        filename = 'teachers.csv';
        break;
      }

      case 'attendance': {
        const attendance = await db.attendance.findMany({
          include: {
            student: { include: { user: true } },
            appointment: {
              include: {
                class: true,
                teacher: { include: { user: true } },
              },
            },
          },
          orderBy: { appointment: { date: 'desc' } },
        });

        const headers = ['ID', 'Student', 'Date', 'Start Time', 'Class', 'Teacher', 'Status'];
        const rows = attendance.map((a) => [
          a.id,
          a.student.user.name,
          a.appointment.date,
          a.appointment.startTime,
          a.appointment.class.name,
          a.appointment.teacher.user.name,
          a.status,
        ].map(escapeCSV).join(','));

        csvContent = [headers.join(','), ...rows].join('\n');
        filename = 'attendance.csv';
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: appointments, students, teachers, attendance' },
          { status: 400 }
        );
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
