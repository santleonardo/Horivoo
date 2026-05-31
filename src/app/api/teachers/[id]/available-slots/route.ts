/**
 * /api/teachers/[id]/available-slots — Grade horária do professor
 * GET:    qualquer autenticado
 * POST:   coordinator ou teacher (própria grade)
 * DELETE: coordinator ou teacher (própria grade)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';

type Row = Record<string, unknown>;

async function assertOwnerOrCoordinator(
  request: NextRequest,
  teacherRecordId: string
): Promise<{ userId: string; email: string; role: string } | NextResponse> {
  const auth = await requireRole(request, 'coordinator', 'teacher');
  if (auth instanceof NextResponse) return auth;

  if (auth.role === 'teacher') {
    const teacher = await db.teacher.findUnique({ where: { user_id: auth.userId } });
    if (!teacher || (teacher as Row)['id'] !== teacherRecordId) {
      return NextResponse.json({ error: 'Acesso proibido' }, { status: 403 });
    }
  }
  return auth;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, 'coordinator', 'teacher', 'student');
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const slots = await db.availableSlot.findMany({
      where: { teacher_id: id },
      orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
    });
    return NextResponse.json({ slots });
  } catch (error) {
    console.error('[available-slots GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar horários' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await assertOwnerOrCoordinator(request, id);
    if (auth instanceof NextResponse) return auth;

    const { dayOfWeek, startTime, endTime } = await request.json() as {
      dayOfWeek: number; startTime: string; endTime: string;
    };
    if (dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }

    const slot = await db.availableSlot.create({
      data: { teacher_id: id, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime },
    });
    return NextResponse.json({ slot }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao criar horário';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'Este horário já existe' }, { status: 400 });
    }
    console.error('[available-slots POST]', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await assertOwnerOrCoordinator(request, id);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slotId');
    if (!slotId) return NextResponse.json({ error: 'slotId é obrigatório' }, { status: 400 });

    await db.availableSlot.delete({ where: { id: slotId, teacher_id: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[available-slots DELETE]', error);
    return NextResponse.json({ error: 'Erro ao remover horário' }, { status: 500 });
  }
}
