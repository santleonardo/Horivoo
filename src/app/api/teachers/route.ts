import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const teachers = await db.teacher.findMany({ orderBy: { name: 'asc' } });

    // Fetch available slots and blocked periods for each teacher
    const teacherIds = (teachers as Record<string, unknown>[]).map(t => t.id as string);
    const [availableSlots, blockedPeriods] = await Promise.all([
      teacherIds.length ? db.availableSlot.findMany({ where: { teacher_id: { in: teacherIds } } }) : [],
      teacherIds.length ? db.blockedPeriod.findMany({ where: { teacher_id: { in: teacherIds } } }) : [],
    ]);

    return NextResponse.json({
      teachers: (teachers as Record<string, unknown>[]).map(t => ({
        id: t.id,
        name: t.name,
        email: t.email,
        subjects: t.subjects,
        bio: t.bio,
        availableSlots: (availableSlots as Record<string, unknown>[]).filter(s => s.teacher_id === t.id),
        blockedPeriods: (blockedPeriods as Record<string, unknown>[]).filter(p => p.teacher_id === t.id),
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
