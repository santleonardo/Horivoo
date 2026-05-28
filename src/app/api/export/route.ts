import { NextRequest, NextResponse } from 'next/server';
import { all } from '@/lib/db';
import { addDays, format, parse, startOfWeek, getDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formatType = searchParams.get('format') || 'csv';
    const teacherId = searchParams.get('teacherId');
    const weekStartStr = searchParams.get('weekStart');
    const month = searchParams.get('month');

    const dates: string[] = [];
    if (weekStartStr) {
      const ws = parse(weekStartStr, 'yyyy-MM-dd', new Date());
      for (let i = 0; i < 7; i++) dates.push(format(addDays(ws, i), 'yyyy-MM-dd'));
    } else if (month) {
      const ms = parse(`${month}-01`, 'yyyy-MM-dd', new Date());
      const days = new Date(ms.getFullYear(), ms.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= days; i++) dates.push(format(new Date(ms.getFullYear(), ms.getMonth(), i), 'yyyy-MM-dd'));
    } else {
      const ws = startOfWeek(new Date(), { weekStartsOn: 1 });
      for (let i = 0; i < 7; i++) dates.push(format(addDays(ws, i), 'yyyy-MM-dd'));
    }

    const datePlaceholders = dates.map(() => '?').join(',');

    // Build bookings query
    const bookingConditions: string[] = [`date IN (${datePlaceholders})`];
    const bookingParams: unknown[] = [...dates];
    if (teacherId) { bookingConditions.push('teacher_id = ?'); bookingParams.push(teacherId); }
    const bookings = all(`SELECT * FROM bookings WHERE ${bookingConditions.join(' AND ')} ORDER BY date ASC, start_time ASC`, bookingParams);

    // Available slots
    const slotConditions: string[] = ['1=1'];
    const slotParams: unknown[] = [];
    if (teacherId) { slotConditions.push('teacher_id = ?'); slotParams.push(teacherId); }
    const availableSlots = all(`SELECT * FROM available_slots WHERE ${slotConditions.join(' AND ')}`, slotParams);

    // Blocked slots
    const bsConditions: string[] = [`date IN (${datePlaceholders})`];
    const bsParams: unknown[] = [...dates];
    if (teacherId) { bsConditions.push('teacher_id = ?'); bsParams.push(teacherId); }
    const blockedSlots = all(`SELECT * FROM blocked_slots WHERE ${bsConditions.join(' AND ')}`, bsParams);

    const nonClassDays = all(`SELECT * FROM non_class_days WHERE date IN (${datePlaceholders})`, dates);
    const hols = all(`SELECT * FROM holidays WHERE date IN (${datePlaceholders})`, dates);

    // Get teacher names
    const tIds = [...new Set([
      ...bookings.map(b => b.teacher_id as string),
      ...availableSlots.map(s => s.teacher_id as string),
    ])];
    const tMap = new Map<string, string>();
    if (tIds.length) {
      const placeholders = tIds.map(() => '?').join(',');
      const teachers = all(`SELECT id, name FROM teachers WHERE id IN (${placeholders})`, tIds);
      teachers.forEach(t => tMap.set(t.id as string, t.name as string));
    }

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    if (formatType === 'csv') {
      const bookedKeys = new Set(bookings.map(b => `${b.date}-${b.start_time}-${b.teacher_id}`));
      const blockedKeys = new Set(blockedSlots.map(b => `${b.date}-${b.start_time}-${b.teacher_id}`));
      const nonClassSet = new Set(nonClassDays.map(n => n.date as string));
      const holidaySet = new Set(hols.map(h => h.date as string));

      const rows: string[] = [];
      for (const b of bookings) {
        const d = new Date((b.date as string) + 'T12:00:00');
        rows.push(`${b.date},${dayNames[d.getDay()]},${b.start_time}-${b.end_time},${tMap.get(b.teacher_id as string) || ''},${b.student_name},Agendado`);
      }
      for (const date of dates) {
        const d = new Date(date + 'T12:00:00');
        const dow = getDay(d);
        const dayName = dayNames[dow];
        const isNCD = nonClassSet.has(date);
        const isHol = holidaySet.has(date);
        for (const slot of availableSlots.filter(s => s.day_of_week === dow)) {
          const key = `${date}-${slot.start_time}-${slot.teacher_id}`;
          if (bookedKeys.has(key)) continue;
          const tName = tMap.get(slot.teacher_id as string) || '';
          if (isNCD || isHol) rows.push(`${date},${dayName},${slot.start_time}-${slot.end_time},${tName},,Dia sem aula`);
          else if (blockedKeys.has(key)) rows.push(`${date},${dayName},${slot.start_time}-${slot.end_time},${tName},,Bloqueado`);
          else rows.push(`${date},${dayName},${slot.start_time}-${slot.end_time},${tName},,Disponível`);
        }
      }

      const csv = ['Data,Dia,Horário,Professor,Aluno,Status', ...rows].join('\n');
      return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=horivoo-agenda.csv' } });
    }

    return NextResponse.json({ error: 'Formato não suportado' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao exportar' }, { status: 500 });
  }
}
