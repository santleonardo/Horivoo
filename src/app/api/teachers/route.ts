import { NextRequest, NextResponse } from 'next/server';
import { all, run } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const teachers = all('SELECT * FROM teachers ORDER BY name ASC');

    // Fetch available slots and blocked periods for each teacher
    const teacherIds = teachers.map(t => t.id as string);
    let availableSlots: Record<string, unknown>[] = [];
    let blockedPeriods: Record<string, unknown>[] = [];

    if (teacherIds.length) {
      const placeholders = teacherIds.map(() => '?').join(',');
      availableSlots = all(`SELECT * FROM available_slots WHERE teacher_id IN (${placeholders})`, teacherIds);
      blockedPeriods = all(`SELECT * FROM blocked_periods WHERE teacher_id IN (${placeholders})`, teacherIds);
    }

    return NextResponse.json({
      teachers: teachers.map(t => ({
        id: t.id,
        name: t.name,
        email: t.email,
        subjects: t.subjects,
        bio: t.bio,
        availableSlots: availableSlots.filter(s => s.teacher_id === t.id),
        blockedPeriods: blockedPeriods.filter(p => p.teacher_id === t.id),
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

    const id = randomUUID();
    run('INSERT INTO teachers (id, user_id, name, email, subjects, bio) VALUES (?, ?, ?, ?, ?, ?)', [id, userId || null, name, email, subjects || '', bio || '']);
    const teacher = { id, user_id: userId || null, name, email, subjects: subjects || '', bio: bio || '' };

    return NextResponse.json({ teacher }, { status: 201 });
  } catch (error) {
    console.error('Error creating teacher:', error);
    return NextResponse.json({ error: 'Erro ao criar professor' }, { status: 500 });
  }
}
