import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword, createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'signup') {
      const { name, email, password, role, subjects, bio, responsibleName, notes, phone } = body;

      if (!name || !password || !role) {
        return NextResponse.json(
          { error: 'Name, password, and role are required' },
          { status: 400 }
        );
      }

      const existingUser = await db.user.findUnique({ where: { email: email || '' } });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 409 }
        );
      }

      const hashedPassword = await hashPassword(password);
      const userEmail = email || (role === 'student' ? `student_${Date.now()}@horivoo.local` : '');

      if (!userEmail) {
        return NextResponse.json(
          { error: 'Email is required for this role' },
          { status: 400 }
        );
      }

      const user = await db.user.create({
        data: {
          name,
          email: userEmail,
          phone: phone || '',
          password: hashedPassword,
          role,
        },
      });

      let teacherId: string | null = null;
      let studentId: string | null = null;

      if (role === 'teacher') {
        const teacher = await db.teacher.create({
          data: {
            userId: user.id,
            subjects: subjects || '',
            bio: bio || '',
          },
        });
        teacherId = teacher.id;
      } else if (role === 'student') {
        const student = await db.student.create({
          data: {
            userId: user.id,
            responsibleName: responsibleName || '',
            notes: notes || '',
          },
        });
        studentId = student.id;
      }
      // Coordinator: only user, no separate profile

      const token = await createToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return NextResponse.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          teacherId,
          studentId,
        },
      });
    }

    // Login
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { teacher: true, student: true },
    });

    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        teacherId: user.teacher?.id || null,
        studentId: user.student?.id || null,
      },
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
