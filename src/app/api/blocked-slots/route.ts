/**
 * /api/blocked-slots — Bloqueios pontuais de horário do professor
 * GET:    coordinator ou teacher (próprio)
 * POST:   coordinator ou teacher (próprio)
 * Gerenciamento de indisponibilidades específicas por data/hora
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';

type Row = Record<string, unknown>;

async function resolveTeacher(userId: string): Promise<string | null> {
  const t = await db.teacher.findUnique({ where: { user_id: userId } });
  return t ? (t as Row)['id'] as string : null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, 'coordinator', 'teacher');
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const date      = searchParams.get('date');
    const where: Row = {};

    if (auth.role === 'teacher') {
      const tid = await resolveTeacher(auth.userId);
      if (!tid) return NextResponse.json({ blockedSlots: [] });
      where['teacher_id'] = tid;
    } else if (teacherId) {
      where['teacher_id'] = teacherId;
    }

    if (date) where['date'] = date;

    const blockedSlots = await db.blockedSlot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
    });
    return NextResponse.json({ blockedSlots });
  } catch (error) {
    console.error('[blocked-slots GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar bloqueios' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, 'coordinator', 'teacher');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json() as {
      teacherId?: string; date: string; startTime: string; endTime: string; reason?: string;
    };

    let teacherId = body.teacherId;
    if (auth.role === 'teacher') {
      const tid = await resolveTeacher(auth.userId);
      if (!tid) return NextResponse.json({ error: 'Professor não encontrado' }, { status: 404 });
      teacherId = tid;
    }
    if (!teacherId) return NextResponse.json({ error: 'teacherId obrigatório' }, { status: 400 });

    const slot = await db.blockedSlot.create({
      data: {
        teacher_id: teacherId,
        date:       body.date,
        start_time: body.startTime,
        end_time:   body.endTime,
        reason:     body.reason || '',
      },
    });
    return NextResponse.json({ slot }, { status: 201 });
  } catch (error) {
    console.error('[blocked-slots POST]', error);
    return NextResponse.json({ error: 'Erro ao criar bloqueio' }, { status: 500 });
  }
}
