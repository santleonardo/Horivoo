/**
 * /api/classes — CRUD de turmas
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const classes = await db.class_.findMany({ orderBy: { name: 'asc' } });

    // Enrich with teacher info
    const teacherIds = [...new Set((classes as Row[]).map(c => c['teacherId'] as string).filter(Boolean))];
    const teachers = teacherIds.length
      ? await db.teacher.findMany({ where: { id: { in: teacherIds } } })
      : [];
    const tMap = new Map((teachers as Row[]).map(t => [t['id'], t['name']]));

    const enriched = (classes as Row[]).map(c => ({
      ...c,
      teacherName: tMap.get(c['teacherId'] as string) || '',
    }));

    return NextResponse.json({ classes: enriched });
  } catch (error) {
    console.error('[classes GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar turmas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Apenas coordenadores podem criar turmas' }, { status: 403 });
    }

    const body = await request.json() as {
      name: string;
      subject: string;
      teacherId: string;
    };

    const { name, subject, teacherId } = body;

    if (!name || !subject || !teacherId) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const cls = await db.class_.create({
      data: { name, subject, teacher_id: teacherId },
    });

    return NextResponse.json({ class: cls }, { status: 201 });
  } catch (error) {
    console.error('[classes POST]', error);
    return NextResponse.json({ error: 'Erro ao criar turma' }, { status: 500 });
  }
}
