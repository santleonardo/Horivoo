import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const teachers = await db.teacher.findMany({
      include: { availableSlots: true, blockedPeriods: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      teachers: teachers.map(t => ({
        id: t.id,
        name: t.name,
        email: t.email,
        subjects: t.subjects,
        bio: t.bio,
        availableSlots: t.availableSlots,
        blockedPeriods: t.blockedPeriods,
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
      data: { name, email, subjects: subjects || '', bio: bio || '', userId: userId || '' },
    });

    return NextResponse.json({ teacher }, { status: 201 });
  } catch (error) {
    console.error('Error creating teacher:', error);
    return NextResponse.json({ error: 'Erro ao criar professor' }, { status: 500 });
  }
}
