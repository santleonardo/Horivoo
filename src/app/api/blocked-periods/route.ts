/**
 * /api/blocked-periods — Períodos de indisponibilidade do professor
 * GET: Coordinator or teacher (own)
 * POST: Teacher (own) or coordinator
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'coordinator', 'teacher');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const where: Row = {};

    if (authResult.role === 'teacher') {
      // Teachers can only view their own blocked periods
      const teacher = await db.teacher.findUnique({ where: { user_id: authResult.userId } });
      if (teacher) where['teacher_id'] = (teacher as Row)['id'];
    } else if (teacherId) {
      where['teacher_id'] = teacherId;
    }

    const blockedPeriods = await db.blockedPeriod.findMany({
      where,
      orderBy: { start_date: 'asc' },
    });
    return NextResponse.json({ blockedPeriods });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar períodos bloqueados' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'coordinator', 'teacher');
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json() as Row;
    const { teacherId, startDate, endDate, reason } = body as {
      teacherId: string;
      startDate: string;
      endDate: string;
      reason?: string;
    };

    if (!teacherId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    // Teachers can only block their own periods
    if (authResult.role === 'teacher') {
      const teacher = await db.teacher.findUnique({ where: { user_id: authResult.userId } });
      if (!teacher || (teacher as Row)['id'] !== teacherId) {
        return NextResponse.json({ error: 'Não autorizado a bloquear períodos de outro professor' }, { status: 403 });
      }
    }

    const blockedPeriod = await db.blockedPeriod.create({
      data: {
        teacher_id: teacherId,
        start_date: startDate,
        end_date: endDate,
        reason: reason || null,
      },
    });
    return NextResponse.json({ blockedPeriod }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar período bloqueado' }, { status: 500 });
  }
}
