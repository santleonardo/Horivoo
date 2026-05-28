import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addDays, format, parse, startOfWeek, getDay } from 'date-fns';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const weekStartStr = searchParams.get('weekStart');

    let weekStart: Date;
    if (weekStartStr) {
      weekStart = parse(weekStartStr, 'yyyy-MM-dd', new Date());
    } else {
      weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    }

    // Get teacher's available slots (recurring weekly pattern)
    const availableSlots = await db.availableSlot.findMany({
      where: { teacherId: id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    // Build week dates array
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      weekDates.push(format(addDays(weekStart, i), 'yyyy-MM-dd'));
    }

    // Fetch all data for the week in parallel
    const [blockedSlots, bookings, nonClassDays, holidays, recurringBookings] = await Promise.all([
      db.blockedSlot.findMany({
        where: { teacherId: id, date: { in: weekDates } },
      }),
      db.booking.findMany({
        where: { teacherId: id, date: { in: weekDates } },
      }),
      db.nonClassDay.findMany({
        where: { date: { in: weekDates } },
      }),
      db.holiday.findMany({
        where: { date: { in: weekDates } },
      }),
      db.recurringBooking.findMany({
        where: { teacherId: id, active: true },
      }),
    ]);

    // Build the schedule for each day
    const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    interface SlotResult {
      startTime: string;
      endTime: string;
      status: 'available' | 'booked' | 'blocked' | 'non_class_day';
      booking?: { id?: string; studentName: string; studentEmail?: string | null; recurring?: boolean; recurringId?: string };
      recurringBooking?: { studentName: string; studentEmail?: string | null };
      blockedSlot?: { id: string; reason?: string };
    }

    interface DayResult {
      date: string;
      dayOfWeek: number;
      dayName: string;
      isNonClassDay: boolean;
      nonClassReason?: string;
      isHoliday: boolean;
      holidayName?: string;
      slots: SlotResult[];
    }

    const schedule: DayResult[] = [];

    for (let i = 0; i < 7; i++) {
      const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
      const dayOfWeek = getDay(addDays(weekStart, i)); // 0=Sunday, 1=Monday, ...

      // Check if the date is a NonClassDay or Holiday
      const nonClassDay = nonClassDays.find(ncd => ncd.date === date);
      const holiday = holidays.find(h => h.date === date);

      // Get slots for this day of week
      const daySlots = availableSlots.filter(s => s.dayOfWeek === dayOfWeek);

      const slots: SlotResult[] = daySlots.map(slot => {
        // 1. Check if the date is a NonClassDay or Holiday → status: "non_class_day"
        if (nonClassDay || holiday) {
          return {
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: 'non_class_day' as const,
          };
        }

        // 2. Check if there's a BlockedSlot for that date+time → status: "blocked"
        const blocked = blockedSlots.find(
          b => b.date === date && b.startTime === slot.startTime && b.endTime === slot.endTime
        );
        if (blocked) {
          return {
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: 'blocked' as const,
            blockedSlot: {
              id: blocked.id,
              reason: blocked.reason || undefined,
            },
          };
        }

        // 3. Check if there's a Booking for that date+time → status: "booked" with booking info
        const booking = bookings.find(
          b => b.date === date && b.startTime === slot.startTime && b.endTime === slot.endTime
        );
        if (booking) {
          return {
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: 'booked' as const,
            booking: {
              id: booking.id,
              studentName: booking.studentName,
              studentEmail: booking.studentEmail,
              recurring: !!booking.recurringId,
            },
          };
        }

        // 4. Check if there's an active RecurringBooking for that dayOfWeek+time → also "booked"
        const recurring = recurringBookings.find(
          rb => rb.dayOfWeek === dayOfWeek && rb.startTime === slot.startTime && rb.endTime === slot.endTime
        );
        if (recurring) {
          return {
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: 'booked' as const,
            booking: {
              studentName: recurring.studentName,
              studentEmail: recurring.studentEmail,
              recurring: true,
              recurringId: recurring.id,
            },
          };
        }

        // 5. Otherwise → status: "available"
        return {
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: 'available' as const,
        };
      });

      schedule.push({
        date,
        dayOfWeek,
        dayName: DAY_NAMES[dayOfWeek] || '',
        isNonClassDay: !!nonClassDay,
        nonClassReason: nonClassDay?.reason || undefined,
        isHoliday: !!holiday,
        holidayName: holiday?.name || undefined,
        slots,
      });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Erro ao buscar agenda' }, { status: 500 });
  }
}
