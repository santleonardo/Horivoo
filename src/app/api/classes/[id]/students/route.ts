/**
 * /api/classes/[id]/students — Manage students in a class
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

type Row = Record<string, unknown>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const classStudents = await db.classStudent.findMany({ where: { class_id: id } });

    // Enrich with student details
    const studentIds = (classStudents as Row[]).map(cs => cs['studentId'] as string).filter(Boolean);
    const students = studentIds.length
      ? await db.student.findMany({ where: { id: { in: studentIds } } })
      : [];
    const sMap = new Map((students as Row[]).map(s => [s['id'], s]));

    const enriched = (classStudents as Row[]).map(cs => ({
      ...cs,
      student: sMap.get(cs['studentId'] as string) || null,
    }));

    return NextResponse.json({ students: enriched });
  } catch (error) {
    console.error('[classes/[id]/students GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar alunos da turma' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Apenas coordenadores podem gerenciar turmas' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json() as { studentId: string };
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'studentId é obrigatório' }, { status: 400 });
    }

    // Check if already enrolled
    const existing = await db.classStudent.findFirst({
      where: { class_id: id, student_id: studentId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Aluno já matriculado nesta turma' }, { status: 400 });
    }

    const enrollment = await db.classStudent.create({
      data: { class_id: id, student_id: studentId },
    });

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    console.error('[classes/[id]/students POST]', error);
    return NextResponse.json({ error: 'Erro ao matricular aluno' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Apenas coordenadores podem gerenciar turmas' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId é obrigatório' }, { status: 400 });
    }

    await db.classStudent.delete({ where: { class_id: id, student_id: studentId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[classes/[id]/students DELETE]', error);
    return NextResponse.json({ error: 'Erro ao remover aluno da turma' }, { status: 500 });
  }
}
