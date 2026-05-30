/**
 * /api/teachers/[id]/availability — Teacher availability (slots)
 * GET: All authenticated
 * POST: Teacher (own) or coordinator
 * DELETE: Teacher (own) or coordinator
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';

type Row = Record<string, unknown>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, 'coordinator', 'teacher', 'student');
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const slots = await db.availableSlot.findMany({ where: { teacher_id: id }, orderBy: { day_of_week: 'asc' } });
    return NextResponse.json({ slots });
  } catch (error) {
    console.error('[teachers/[id]/availability GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar disponibilidade' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, 'coordinator', 'teacher');
    if (authResult instanceof NextResponse) return authResult;

    // Teachers can only manage their own availability
    const { id } = await params;
    if (authResult.role === 'teacher') {
      const teacher = await db.teacher.findUnique({ where: { user_id: authResult.userId } });
      if (!teacher || (teacher as Row)['id'] !== id) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
      }
    }

    const body = await request.json() as {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    };

    const { dayOfWeek, startTime, endTime } = body;

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }

    // Check for duplicate
    const existing = await db.availableSlot.findFirst({
      where: { teacher_id: id, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime },
    });

    if (existing) {
      return NextResponse.json({ error: 'Slot já existe' }, { status: 400 });
    }

    const slot = await db.availableSlot.create({
      data: { teacher_id: id, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime },
    });

    return NextResponse.json({ slot }, { status: 201 });
  } catch (error) {
    console.error('[teachers/[id]/availability POST]', error);
    return NextResponse.json({ error: 'Erro ao criar slot' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, 'coordinator', 'teacher');
    if (authResult instanceof NextResponse) return authResult;

    // Teachers can only manage their own availability
    const { id } = await params;
    if (authResult.role === 'teacher') {
      const teacher = await db.teacher.findUnique({ where: { user_id: authResult.userId } });
      if (!teacher || (teacher as Row)['id'] !== id) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slotId');

    if (!slotId) {
      return NextResponse.json({ error: 'slotId é obrigatório' }, { status: 400 });
    }

    await db.availableSlot.delete({ where: { id: slotId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[teachers/[id]/availability DELETE]', error);
    return NextResponse.json({ error: 'Erro ao remover slot' }, { status: 500 });
  }
}
