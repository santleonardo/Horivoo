import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { format } from 'date-fns';

export async function GET() {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const [bookings, holidays, recesses, teachers] = await Promise.all([
      db.booking.findMany({
        where: { date: { gte: today } },
        include: { teacher: true },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        take: 100,
      }),
      db.holiday.findMany({ orderBy: { date: 'asc' } }),
      db.recess.findMany({ orderBy: { startDate: 'asc' } }),
      db.teacher.findMany({
        include: { availableSlots: true, blockedPeriods: true },
      }),
    ]);

    return NextResponse.json({
      bookings,
      holidays,
      recesses,
      teachers,
    });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados do calendário' }, { status: 500 });
  }
}
