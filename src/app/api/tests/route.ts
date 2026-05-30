/**
 * /api/tests — CRUD de provas
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    const where: Row = {};
    if (classId) where['class_id'] = classId;

    // Role-based filtering
    if (user.role === 'teacher') {
      const teacher = await db.teacher.findUnique({ where: { user_id: user.userId } });
      if (teacher) {
        const teacherClasses = await db.class_.findMany({ where: { teacher_id: (teacher as Row)['id'] } });
        const classIds = (teacherClasses as Row[]).map(c => c['id'] as string);
        where['class_id'] = { in: classIds };
      }
    }

    const tests = await db.test.findMany({ where, orderBy: { date: 'asc' } });

    // Enrich with class info
    const tClassIds = [...new Set((tests as Row[]).map(t => t['classId'] as string).filter(Boolean))];
    const classes = tClassIds.length ? await db.class_.findMany({ where: { id: { in: tClassIds } } }) : [];
    const cMap = new Map((classes as Row[]).map(c => [c['id'], c['name']]));

    const enriched = (tests as Row[]).map(t => ({
      ...t,
      className: cMap.get(t['classId'] as string) || '',
    }));

    return NextResponse.json({ tests: enriched });
  } catch (error) {
    console.error('[tests GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar provas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Apenas coordenadores podem criar provas' }, { status: 403 });
    }

    const body = await request.json() as {
      classId: string;
      title: string;
      date: string;
    };

    const { classId, title, date } = body;

    if (!classId || !title || !date) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const test = await db.test.create({
      data: { class_id: classId, title, date },
    });

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    console.error('[tests POST]', error);
    return NextResponse.json({ error: 'Erro ao criar prova' }, { status: 500 });
  }
}
