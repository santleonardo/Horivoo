import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Allow coordinators or the teacher themselves to update
    if (user.role !== 'coordinator' && user.teacher?.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { subjects, bio } = body;

    const teacher = await db.teacher.findUnique({ where: { id } });
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Update teacher profile only (not user data - that goes through /api/auth/me)
    const teacherUpdateData: { subjects?: string; bio?: string } = {};
    if (subjects !== undefined) teacherUpdateData.subjects = subjects;
    if (bio !== undefined) teacherUpdateData.bio = bio;

    const updatedTeacher = await db.teacher.update({
      where: { id },
      data: teacherUpdateData,
      include: {
        user: true,
        availability: true,
        classes: true,
      },
    });

    return NextResponse.json(updatedTeacher);
  } catch (error) {
    console.error('Patch teacher error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can update teachers' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { subjects, bio, name, phone, email } = body;

    const teacher = await db.teacher.findUnique({ where: { id } });
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Update user data if provided
    if (name !== undefined || phone !== undefined || email !== undefined) {
      const userUpdateData: { name?: string; phone?: string; email?: string } = {};
      if (name !== undefined) userUpdateData.name = name;
      if (phone !== undefined) userUpdateData.phone = phone;
      if (email !== undefined) {
        // Check email uniqueness
        const existingUser = await db.user.findUnique({ where: { email } });
        if (existingUser && existingUser.id !== teacher.userId) {
          return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
        }
        userUpdateData.email = email;
      }
      await db.user.update({
        where: { id: teacher.userId },
        data: userUpdateData,
      });
    }

    // Update teacher profile
    const teacherUpdateData: { subjects?: string; bio?: string } = {};
    if (subjects !== undefined) teacherUpdateData.subjects = subjects;
    if (bio !== undefined) teacherUpdateData.bio = bio;

    const updatedTeacher = await db.teacher.update({
      where: { id },
      data: teacherUpdateData,
      include: {
        user: true,
        availability: true,
        classes: true,
      },
    });

    return NextResponse.json(updatedTeacher);
  } catch (error) {
    console.error('Update teacher error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can delete teachers' }, { status: 403 });
    }

    const { id } = await params;

    const teacher = await db.teacher.findUnique({ where: { id } });
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Deleting the teacher will cascade delete from user
    await db.user.delete({ where: { id: teacher.userId } });

    return NextResponse.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
