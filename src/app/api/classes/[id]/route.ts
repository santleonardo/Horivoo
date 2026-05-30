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
      return NextResponse.json({ error: 'Only coordinators can update classes' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, subject, teacherId } = body;

    const existingClass = await db.class.findUnique({ where: { id } });
    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if (teacherId) {
      const teacher = await db.teacher.findUnique({ where: { id: teacherId } });
      if (!teacher) {
        return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
      }
    }

    const updateData: { name?: string; subject?: string; teacherId?: string } = {};
    if (name !== undefined) updateData.name = name;
    if (subject !== undefined) updateData.subject = subject;
    if (teacherId !== undefined) updateData.teacherId = teacherId;

    const updatedClass = await db.class.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error('Update class error:', error);
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
      return NextResponse.json({ error: 'Only coordinators can delete classes' }, { status: 403 });
    }

    const { id } = await params;

    const existingClass = await db.class.findUnique({ where: { id } });
    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    await db.class.delete({ where: { id } });

    return NextResponse.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
