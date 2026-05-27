import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addDays, format, parse, startOfWeek } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const studentId = searchParams.get('studentId');
    const studentProfileId = searchParams.get('studentProfileId');
    const date = searchParams.get('date');
    const weekStartStr = searchParams.get('weekStart');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (teacherId) where.teacherId = teacherId;
    if (studentId) where.studentId = studentId;
    if (studentProfileId) where.studentProfileId = studentProfileId;
    if (date) where.date = date;
    if (status) where.status = status;

    if (weekStartStr) {
      const weekStart = parse(weekStartStr, 'yyyy-MM-dd', new Date());
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        weekDates.push(format(addDays(weekStart, i), 'yyyy-MM-dd'));
      }
      where.date = { in: weekDates };
    }

    const bookings = await db.booking.findMany({
      where,
      include: { teacher: true, studentProfile: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacherId, studentName, studentEmail, date, startTime, endTime, studentProfileId } = body;

    if (!teacherId || !studentName || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const dateObj = new Date(date + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();

    // Validate: slot must be in available slots
    const availableSlot = await db.availableSlot.findFirst({
      where: { teacherId, dayOfWeek, startTime, endTime },
    });
    if (!availableSlot) {
      return NextResponse.json(
        { error: 'Este horário não está disponível para este professor' },
        { status: 400 }
      );
    }

    // Validate: no conflict with existing booking
    const existingBooking = await db.booking.findFirst({
      where: { teacherId, date, startTime, endTime, status: 'confirmed' },
    });
    if (existingBooking) {
      return NextResponse.json(
        { error: 'Já existe um agendamento neste horário' },
        { status: 400 }
      );
    }

    // Validate: no conflict with blocked slot
    const blockedSlot = await db.blockedSlot.findFirst({
      where: { teacherId, date, startTime, endTime },
    });
    if (blockedSlot) {
      return NextResponse.json(
        { error: 'Este horário está bloqueado' },
        { status: 400 }
      );
    }

    // Validate: not a non-class day
    const nonClassDay = await db.nonClassDay.findFirst({
      where: { date },
    });
    if (nonClassDay) {
      return NextResponse.json(
        { error: 'Esta data é um dia sem aula' },
        { status: 400 }
      );
    }

    // Validate: not a holiday
    const holiday = await db.holiday.findFirst({
      where: { date },
    });
    if (holiday) {
      return NextResponse.json(
        { error: 'Esta data é um feriado' },
        { status: 400 }
      );
    }

    // Validate: not in a recess period
    const recess = await db.recess.findFirst({
      where: {
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });
    if (recess) {
      return NextResponse.json(
        { error: 'Esta data está em período de recesso' },
        { status: 400 }
      );
    }

    // Validate: not in a blocked period for this teacher
    const blockedPeriod = await db.blockedPeriod.findFirst({
      where: {
        teacherId,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });
    if (blockedPeriod) {
      return NextResponse.json(
        { error: 'Este professor está indisponível nesta data' },
        { status: 400 }
      );
    }

    const booking = await db.booking.create({
      data: {
        teacherId,
        studentName,
        studentEmail: studentEmail || null,
        studentProfileId: studentProfileId || null,
        date,
        dayOfWeek,
        startTime,
        endTime,
        status: 'confirmed',
      },
      include: { teacher: true, studentProfile: true },
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 });
  }
}
