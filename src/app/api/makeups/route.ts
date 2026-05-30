/**
 * /api/makeups — CRUD de reposições de aula
 * GET: All authenticated users
 * POST: Only coordinator
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'coordinator', 'teacher', 'student');
    if (authResult instanceof NextResponse) return authResult;

    const makeups = await db.makeUpClass.findMany({ orderBy: { new_date: 'asc' } });

    // Enrich with original appointment info
    const originalIds = [...new Set((makeups as Row[]).map(m => m['originalAppointmentId'] as string).filter(Boolean))];
    const appointments = originalIds.length
      ? await db.appointment.findMany({ where: { id: { in: originalIds } } })
      : [];
    const aMap = new Map((appointments as Row[]).map(a => [a['id'], a]));

    const enriched = (makeups as Row[]).map(m => ({
      ...m,
      originalAppointment: aMap.get(m['originalAppointmentId'] as string) || null,
    }));

    return NextResponse.json({ makeups: enriched });
  } catch (error) {
    console.error('[makeups GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar reposições' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'coordinator');
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json() as {
      originalAppointmentId: string;
      newDate: string;
      newStartTime: string;
      newEndTime: string;
    };

    const { originalAppointmentId, newDate, newStartTime, newEndTime } = body;

    if (!originalAppointmentId || !newDate || !newStartTime || !newEndTime) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    // Verify original appointment exists
    const original = await db.appointment.findUnique({ where: { id: originalAppointmentId } });
    if (!original) {
      return NextResponse.json({ error: 'Agendamento original não encontrado' }, { status: 404 });
    }

    // Cancel the original appointment
    await db.appointment.update({
      where: { id: originalAppointmentId },
      data: { status: 'cancelled_by_makeup' },
    });

    // Create the makeup class record
    const makeup = await db.makeUpClass.create({
      data: {
        original_appointment_id: originalAppointmentId,
        new_date: newDate,
        new_start_time: newStartTime,
        new_end_time: newEndTime,
      },
    });

    // Create a new appointment for the makeup
    const teacherId = (original as Row)['teacherId'] as string;
    const studentId = (original as Row)['studentId'] as string | null;
    const classId = (original as Row)['classId'] as string | null;
    const dayOfWeek = new Date(newDate + 'T12:00:00').getDay();

    const newAppointment = await db.appointment.create({
      data: {
        teacher_id: teacherId,
        student_id: studentId,
        class_id: classId,
        date: newDate,
        day_of_week: dayOfWeek,
        start_time: newStartTime,
        end_time: newEndTime,
        status: 'confirmed',
        booking_type: 'reposition',
        original_booking_id: originalAppointmentId,
        notes: 'Reposição de aula',
      },
    });

    return NextResponse.json({ makeup, appointment: newAppointment }, { status: 201 });
  } catch (error) {
    console.error('[makeups POST]', error);
    return NextResponse.json({ error: 'Erro ao criar reposição' }, { status: 500 });
  }
}
