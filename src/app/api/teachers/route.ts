import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Row = Record<string, unknown>;

export async function GET() {
  try {
    const teachers = await db.teacher.findMany({ orderBy: { name: 'asc' } });

    // Fetch available slots and blocked periods for each teacher
    const teacherIds = (teachers as Row[]).map(t => t['id'] as string);
    const [availableSlots, blockedPeriods] = await Promise.all([
      teacherIds.length ? db.availableSlot.findMany({ where: { teacher_id: { in: teacherIds } } }) : [],
      teacherIds.length ? db.blockedPeriod.findMany({ where: { teacher_id: { in: teacherIds } } }) : [],
    ]);

    // After toCamel, nested objects also have camelCase keys
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
  try {
    const body = await request.json();
    const { name, email, subjects, bio, userId } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 });
    }

    const teacher = await db.teacher.create({
      data: { name, email, subjects: subjects || '', bio: bio || '', user_id: userId || null },
    });

    return NextResponse.json({ teacher }, { status: 201 });
  } catch (error) {
    console.error('Error creating teacher:', error);
    return NextResponse.json({ error: 'Erro ao criar professor' }, { status: 500 });
  }
}
