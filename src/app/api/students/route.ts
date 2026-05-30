import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest, hashPassword } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const students = await db.student.findMany({
      include: {
        user: true,
        classStudents: {
          include: {
            class: {
              include: {
                teacher: {
                  include: { user: true },
                },
              },
            },
          },
        },
        attendance: true,
      },
      orderBy: { user: { name: 'asc' } },
    });

    const result = students.map((student) => ({
      ...student,
      attendanceCount: student.attendance.length,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('List students error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can create students' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, phone, responsibleName, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate placeholder email if not provided
    const studentEmail = email && email.trim() !== '' ? email : `student_${Date.now()}@horivoo.local`;

    const existingUser = await db.user.findUnique({ where: { email: studentEmail } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    // Auto-generate password if not provided
    const studentPassword = password && password.trim() !== '' ? password : `stu${Date.now()}`;
    const hashedPassword = await hashPassword(studentPassword);

    const newUser = await db.user.create({
      data: {
        name,
        email: studentEmail,
        phone: phone || '',
        password: hashedPassword,
        role: 'student',
      },
    });

    const student = await db.student.create({
      data: {
        userId: newUser.id,
        responsibleName: responsibleName || '',
        notes: notes || '',
      },
      include: {
        user: true,
        classStudents: {
          include: {
            class: true,
          },
        },
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
