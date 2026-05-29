/**
 * /api/bookings/route.ts (atualizado v0.3)
 * Novos filtros no GET:
 *   ?studentEmail=   → aulas de um aluno específico (para a página Minhas Aulas)
 *   ?from=yyyy-MM-dd → data inicial do filtro
 *   ?to=yyyy-MM-dd   → data final do filtro
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addDays, format, parse } from 'date-fns';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId        = searchParams.get('teacherId');
    const studentProfileId = searchParams.get('studentProfileId');
    const studentEmail     = searchParams.get('studentEmail');   // ← NOVO
    const date             = searchParams.get('date');
    const weekStartStr     = searchParams.get('weekStart');
    const fromStr          = searchParams.get('from');           // ← NOVO
    const toStr            = searchParams.get('to');             // ← NOVO
    const status           = searchParams.get('status');
    const bookingType      = searchParams.get('bookingType');

    const where: Row = {};
    if (teacherId)        where['teacher_id']        = teacherId;
    if (studentProfileId) where['student_profile_id'] = studentProfileId;
    if (studentEmail)     where['student_email']      = studentEmail;
    if (date)             where['date']               = date;
    if (status)           where['status']             = status;
    if (bookingType)      where['booking_type']       = bookingType;

    if (weekStartStr) {
      const weekStart = parse(weekStartStr, 'yyyy-MM-dd', new Date());
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) weekDates.push(format(addDays(weekStart, i), 'yyyy-MM-dd'));
      where['date'] = { in: weekDates };
    } else if (fromStr && toStr) {
      // Build list of dates between from and to (max 31 days)
      const from = parse(fromStr, 'yyyy-MM-dd', new Date());
      const to   = parse(toStr,   'yyyy-MM-dd', new Date());
      const dates: string[] = [];
      let cur = from;
      while (cur <= to && dates.length < 31) {
        dates.push(format(cur, 'yyyy-MM-dd'));
        cur = addDays(cur, 1);
      }
      where['date'] = { in: dates };
    }

    const bookings = await db.booking.findMany({
      where,
      orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
    });

    const tIds = [...new Set((bookings as Row[]).map(b => b['teacherId'] as string))];
    const teachers = tIds.length
      ? await db.teacher.findMany({ where: { id: { in: tIds } } })
      : [];
    const tMap = new Map((teachers as Row[]).map(t => [t['id'], t]));

    const enriched = (bookings as Row[]).map(b => ({
      ...b,
      // Fields already camelCase after toCamel — keep explicit aliases for API consumers
      startTime:         b['startTime'],
      endTime:           b['endTime'],
      studentName:       b['studentName'],
      studentEmail:      b['studentEmail'],
      bookingType:       b['bookingType'],
      originalBookingId: b['originalBookingId'],
      teacherName:       (tMap.get(b['teacherId'] as string) as Row | null)?.['name'] ?? '',
      teacher:           tMap.get(b['teacherId'] as string) || null,
    }));

    return NextResponse.json({ bookings: enriched });
  } catch (error) {
    console.error('[bookings GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      teacherId: string;
      studentName: string;
      studentEmail?: string;
      date: string;
      startTime: string;
      endTime: string;
      studentProfileId?: string;
      bookingType?: string;
      originalBookingId?: string;
      notes?: string;
    };
    const {
      teacherId,
      studentName,
      studentEmail,
      date,
      startTime,
      endTime,
      studentProfileId,
      bookingType = 'normal',
      originalBookingId,
      notes = '',
    } = body;

    if (!teacherId || !studentName || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    if (bookingType === 'reposition' && !originalBookingId) {
      return NextResponse.json({ error: 'Reposição precisa de um agendamento original' }, { status: 400 });
    }

    const dayOfWeek = new Date(date + 'T12:00:00').getDay();

    const [avail, existing, blocked, nonClass, holiday, recess, blockedPeriod] = await Promise.all([
      db.availableSlot.findFirst({ where: { teacher_id: teacherId, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime } }),
      db.booking.findFirst({ where: { teacher_id: teacherId, date, start_time: startTime, status: 'confirmed' } }),
      db.blockedSlot.findFirst({ where: { teacher_id: teacherId, date, start_time: startTime } }),
      db.nonClassDay.findFirst({ where: { date } }),
      db.holiday.findFirst({ where: { date } }),
      db.recess.findFirst({ where: { start_date: { lte: date }, end_date: { gte: date } } }),
      db.blockedPeriod.findFirst({ where: { teacher_id: teacherId, start_date: { lte: date }, end_date: { gte: date } } }),
    ]);

    if (!avail)          return NextResponse.json({ error: 'Horário não disponível para este professor' }, { status: 400 });
    if (existing)        return NextResponse.json({ error: 'Já existe agendamento neste horário' }, { status: 400 });
    if (blocked)         return NextResponse.json({ error: 'Horário bloqueado' }, { status: 400 });
    if (nonClass)        return NextResponse.json({ error: 'Dia sem aula' }, { status: 400 });
    if (holiday)         return NextResponse.json({ error: 'Feriado' }, { status: 400 });
    if (recess)          return NextResponse.json({ error: 'Período de recesso' }, { status: 400 });
    if (blockedPeriod)   return NextResponse.json({ error: 'Professor indisponível nesta data' }, { status: 400 });

    const data: Row = {
      teacher_id:         teacherId,
      student_name:       studentName,
      student_email:      studentEmail || null,
      student_profile_id: studentProfileId || null,
      date,
      day_of_week:        dayOfWeek,
      start_time:         startTime,
      end_time:           endTime,
      status:             'confirmed',
      booking_type:       bookingType,
      notes,
    };

    if (originalBookingId) data['original_booking_id'] = originalBookingId;

    const booking = await db.booking.create({ data });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error('[bookings POST]', error);
    return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 });
  }
}
