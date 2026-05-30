import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, 'coordinator', 'teacher', 'student');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const teachers = await db.teacher.findMany({ orderBy: { name: 'asc' } });

    const teacherIds = (teachers as Row[]).map(t => t['id'] as string);
    const [availableSlots, blockedPeriods] = await Promise.all([
      teacherIds.length ? db.availableSlot.findMany({ where: { teacher_id: { in: teacherIds } } }) : [],
      teacherIds.length ? db.blockedPeriod.findMany({ where: { teacher_id: { in: teacherIds } } }) : [],
    ]);

    return NextResponse.json({
      teachers: (teachers as Row[]).map(t => ({
        ...t,
        availableSlots: (availableSlots as Row[]).filter(s => s['teacherId'] === t['id']),
        blockedPeriods: (blockedPeriods as Row[]).filter(p => p['teacherId'] === t['id']),
      })),
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ error: 'Erro ao buscar professores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, 'coordinator');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json() as Record<string, string>;
    const { name, email, subjects, bio } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 });
    }

    const teacher = await db.teacher.create({
      data: { name, email, subjects: subjects || '', bio: bio || '' },
    });
    return NextResponse.json({ teacher }, { status: 201 });
  } catch (error) {
    console.error('Error creating teacher:', error);
    return NextResponse.json({ error: 'Erro ao criar professor' }, { status: 500 });
  }
}
