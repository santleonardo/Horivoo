import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest, hashPassword, createToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teachers = await db.teacher.findMany({
      include: {
        user: true,
        availability: true,
        classes: {
          include: {
            classStudents: {
              include: {
                student: {
                  include: { user: true },
                },
              },
            },
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    return NextResponse.json(teachers);
  } catch (error) {
    console.error('List teachers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can create teachers' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, phone, subjects, bio } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await db.user.create({
      data: {
        name,
        email,
        phone: phone || '',
        password: hashedPassword,
        role: 'teacher',
      },
    });

    const teacher = await db.teacher.create({
      data: {
        userId: newUser.id,
        subjects: subjects || '',
        bio: bio || '',
      },
      include: {
        user: true,
        availability: true,
        classes: true,
      },
    });

    const token = await createToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return NextResponse.json({ teacher, token }, { status: 201 });
  } catch (error) {
    console.error('Create teacher error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
