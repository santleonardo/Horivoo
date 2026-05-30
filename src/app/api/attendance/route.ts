/**
 * /api/attendance — Attendance tracking
 * GET: All authenticated users
 * POST: Only coordinator and teacher can register attendance
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'coordinator', 'teacher', 'student');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');
    const studentId = searchParams.get('studentId');

    const where: Row = {};
    if (appointmentId) where['appointment_id'] = appointmentId;
    if (studentId)     where['student_id'] = studentId;

    const attendance = await db.attendance.findMany({ where });
    return NextResponse.json({ attendance });
  } catch (error) {
    console.error('[attendance GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar presenças' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only coordinator and teacher can register attendance
    const authResult = await requireRole(request, 'coordinator', 'teacher');
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json() as {
      studentId: string;
      appointmentId: string;
      status: 'present' | 'absent' | 'justified';
    };

    const { studentId, appointmentId, status } = body;

    if (!studentId || !appointmentId || !status) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }

    // Upsert: if attendance exists for this student+appointment, update it
    const existing = await db.attendance.findFirst({
      where: { student_id: studentId, appointment_id: appointmentId },
    });

    let attendance: Row;
    if (existing) {
      attendance = await db.attendance.update({
        where: { id: (existing as Row)['id'] },
        data: { status },
      });
    } else {
      attendance = await db.attendance.create({
        data: { student_id: studentId, appointment_id: appointmentId, status },
      });
    }

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (error) {
    console.error('[attendance POST]', error);
    return NextResponse.json({ error: 'Erro ao registrar presença' }, { status: 500 });
  }
}
