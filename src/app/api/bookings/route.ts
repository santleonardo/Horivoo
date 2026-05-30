/**
 * /api/bookings/route.ts (atualizado v0.5)
 * GET: All authenticated users can view
 * POST: Only coordinator can create bookings; uses checkAvailability
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { checkAvailability } from '@/lib/availability';
import { addDays, format, parse } from 'date-fns';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    // All authenticated users can view bookings
    const authResult = await requireRole(request, 'coordinator', 'teacher', 'student');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const teacherId        = searchParams.get('teacherId');
    const studentProfileId = searchParams.get('studentProfileId');
    const studentEmail     = searchParams.get('studentEmail');
    const date             = searchParams.get('date');
    const weekStartStr     = searchParams.get('weekStart');
    const fromStr          = searchParams.get('from');
    const toStr            = searchParams.get('to');
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

    // Role-based filtering: teachers only see their own, students only see their own
    if (authResult.role === 'teacher') {
      const teacher = await db.teacher.findUnique({ where: { user_id: authResult.userId } });
      if (teacher) where['teacher_id'] = (teacher as Row)['id'];
    }
    if (authResult.role === 'student') {
      where['student_email'] = authResult.email;
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
    // Only coordinator can create bookings
    const authResult = await requireRole(request, 'coordinator');
    if (authResult instanceof NextResponse) return authResult;

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

    // Use centralized checkAvailability instead of inline checks
    const availability = await checkAvailability({ teacherId, date, startTime, endTime });
    if (!availability.available) {
      return NextResponse.json({ error: availability.reason }, { status: 400 });
    }

    const dayOfWeek = new Date(date + 'T12:00:00').getDay();

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
