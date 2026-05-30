import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const classes = await db.class.findMany({
      include: {
        teacher: {
          include: { user: true },
        },
        classStudents: {
          include: {
            student: {
              include: { user: true },
            },
          },
        },
        appointments: true,
      },
      orderBy: { name: 'asc' },
    });

    const result = classes.map((cls) => ({
      ...cls,
      appointmentsCount: cls.appointments.length,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('List classes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can create classes' }, { status: 403 });
    }

    const body = await request.json();
    const { name, subject, teacherId } = body;

    if (!name || !subject || !teacherId) {
      return NextResponse.json({ error: 'Name, subject, and teacherId are required' }, { status: 400 });
    }

    const teacher = await db.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const newClass = await db.class.create({
      data: {
        name,
        subject,
        teacherId,
      },
      include: {
        teacher: {
          include: { user: true },
        },
        classStudents: {
          include: {
            student: {
              include: { user: true },
            },
          },
        },
      },
    });

    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    console.error('Create class error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
