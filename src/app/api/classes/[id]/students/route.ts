import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can add students to classes' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { studentIds } = body as { studentIds: string[] };

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'studentIds array is required' }, { status: 400 });
    }

    const existingClass = await db.class.findUnique({ where: { id } });
    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Verify all students exist
    for (const studentId of studentIds) {
      const student = await db.student.findUnique({ where: { id: studentId } });
      if (!student) {
        return NextResponse.json({ error: `Student ${studentId} not found` }, { status: 404 });
      }
    }

    // Create class-student relationships (skip existing ones)
    const created = [];
    for (const studentId of studentIds) {
      try {
        const classStudent = await db.classStudent.create({
          data: { classId: id, studentId },
          include: {
            student: { include: { user: true } },
          },
        });
        created.push(classStudent);
      } catch {
        // Skip if already exists (unique constraint)
      }
    }

    return NextResponse.json({ added: created.length, classStudents: created }, { status: 201 });
  } catch (error) {
    console.error('Add students to class error:', error);
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
      return NextResponse.json({ error: 'Only coordinators can remove students from classes' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const classStudent = await db.classStudent.findFirst({
      where: { classId: id, studentId },
    });

    if (!classStudent) {
      return NextResponse.json({ error: 'Student not in this class' }, { status: 404 });
    }

    await db.classStudent.delete({ where: { id: classStudent.id } });

    return NextResponse.json({ message: 'Student removed from class successfully' });
  } catch (error) {
    console.error('Remove student from class error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
