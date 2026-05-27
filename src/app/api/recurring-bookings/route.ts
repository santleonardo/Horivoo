import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    const where: Record<string, unknown> = {};
    if (teacherId) where.teacherId = teacherId;

    const recurringBookings = await db.recurringBooking.findMany({
      where,
      include: { teacher: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({ recurringBookings });
  } catch (error) {
    console.error('Error fetching recurring bookings:', error);
    return NextResponse.json({ error: 'Erro ao buscar agendamentos recorrentes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacherId, studentName, studentEmail, dayOfWeek, startTime, endTime } = body;

    if (!teacherId || !studentName || dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const recurringBooking = await db.recurringBooking.create({
      data: {
        teacherId,
        studentName,
        studentEmail: studentEmail || null,
        dayOfWeek,
        startTime,
        endTime,
      },
      include: { teacher: true },
    });

    return NextResponse.json({ recurringBooking }, { status: 201 });
  } catch (error) {
    console.error('Error creating recurring booking:', error);
    return NextResponse.json({ error: 'Erro ao criar agendamento recorrente' }, { status: 500 });
  }
}
