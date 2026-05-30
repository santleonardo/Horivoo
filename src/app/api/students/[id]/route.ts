import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can update students' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, phone, email, responsibleName, notes } = body;

    const student = await db.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Update user data if provided
    if (name !== undefined || phone !== undefined || email !== undefined) {
      const userUpdateData: { name?: string; phone?: string; email?: string } = {};
      if (name !== undefined) userUpdateData.name = name;
      if (phone !== undefined) userUpdateData.phone = phone;
      if (email !== undefined) {
        const existingUser = await db.user.findUnique({ where: { email } });
        if (existingUser && existingUser.id !== student.userId) {
          return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
        }
        userUpdateData.email = email;
      }
      await db.user.update({
        where: { id: student.userId },
        data: userUpdateData,
      });
    }

    // Update student profile
    const studentUpdateData: { responsibleName?: string; notes?: string } = {};
    if (responsibleName !== undefined) studentUpdateData.responsibleName = responsibleName;
    if (notes !== undefined) studentUpdateData.notes = notes;

    const updatedStudent = await db.student.update({
      where: { id },
      data: studentUpdateData,
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
      },
    });

    return NextResponse.json(updatedStudent);
  } catch (error) {
    console.error('Update student error:', error);
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
      return NextResponse.json({ error: 'Only coordinators can delete students' }, { status: 403 });
    }

    const { id } = await params;

    const student = await db.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Deleting the student will cascade delete from user
    await db.user.delete({ where: { id: student.userId } });

    return NextResponse.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
