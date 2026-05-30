import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest, hashPassword, verifyPassword } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch full user data from database
    const dbUser = await db.user.findUnique({
      where: { id: authUser.userId },
      include: { teacher: true, student: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone,
      role: dbUser.role,
      teacherId: dbUser.teacher?.id || null,
      studentId: dbUser.student?.id || null,
      teacher: dbUser.teacher || null,
      student: dbUser.student || null,
    });
  } catch (error) {
    console.error('Get me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch full user for password verification
    const dbUser = await db.user.findUnique({
      where: { id: authUser.userId },
      include: { teacher: true, student: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, phone, currentPassword, newPassword } = body;

    const updateData: { name?: string; phone?: string; password?: string } = {};

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    if (newPassword) {
      if (!currentPassword || !(await verifyPassword(currentPassword, dbUser.password))) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }
      updateData.password = await hashPassword(newPassword);
    }

    const updatedUser = await db.user.update({
      where: { id: dbUser.id },
      data: updateData,
      include: { teacher: true, student: true },
    });

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      teacherId: updatedUser.teacher?.id || null,
      studentId: updatedUser.student?.id || null,
    });
  } catch (error) {
    console.error('Update me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
