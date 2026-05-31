/**
 * /api/export — Exportação de dados
 * Coordinator only. Fonte única: appointments.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { addDays, format, parse, startOfWeek, getDay } from 'date-fns';

type Row = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, 'coordinator');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const formatType = searchParams.get('format') || 'csv';
    const teacherId  = searchParams.get('teacherId');
    const weekStartStr = searchParams.get('weekStart');
    const month      = searchParams.get('month');

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

    const where: Row = { date: { in: dates } };
    if (teacherId) where['teacher_id'] = teacherId;

    const [appointments, availableSlots, holidays, nonClassDays] = await Promise.all([
      db.appointment.findMany({ where, orderBy: [{ date: 'asc' }, { start_time: 'asc' }] }),
      db.availableSlot.findMany({ where: teacherId ? { teacher_id: teacherId } : {} }),
      db.holiday.findMany({ where: { date: { in: dates } } }),
      db.nonClassDay.findMany({ where: { date: { in: dates } } }),
    ]);

    const tIds = [...new Set([
      ...(appointments as Row[]).map(a => a['teacherId'] as string),
      ...(availableSlots as Row[]).map(s => s['teacherId'] as string),
    ].filter(Boolean))];
    const teachers = tIds.length ? await db.teacher.findMany({ where: { id: { in: tIds } } }) : [];
    const tMap = new Map((teachers as Row[]).map(t => [t['id'] as string, t['name'] as string]));

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    if (formatType === 'csv') {
      const bookedKeys = new Set((appointments as Row[]).map(a => `${a['date']}-${a['startTime']}-${a['teacherId']}`));
      const nonClassSet = new Set((nonClassDays as Row[]).map(n => n['date'] as string));
      const holidaySet  = new Set((holidays as Row[]).map(h => h['date'] as string));

      const rows: string[] = [];

      // Appointments confirmados
      for (const a of appointments as Row[]) {
        const d = new Date((a['date'] as string) + 'T12:00:00');
        const tName = tMap.get(a['teacherId'] as string) || '';
        const type  = a['bookingType'] === 'reposition' ? 'Reposição' : 'Agendado';
        rows.push(`${a['date']},${dayNames[d.getDay()]},${a['startTime']}-${a['endTime']},${tName},${a['studentId'] || ''},${type}`);
      }

      // Slots disponíveis ainda livres
      for (const date of dates) {
        const d   = new Date(date + 'T12:00:00');
        const dow = getDay(d);
        for (const slot of (availableSlots as Row[]).filter(s => s['dayOfWeek'] === dow)) {
          const key = `${date}-${slot['startTime']}-${slot['teacherId']}`;
          if (bookedKeys.has(key)) continue;
          const tName = tMap.get(slot['teacherId'] as string) || '';
          const status = nonClassSet.has(date) || holidaySet.has(date) ? 'Dia sem aula' : 'Disponível';
          rows.push(`${date},${dayNames[dow]},${slot['startTime']}-${slot['endTime']},${tName},,${status}`);
        }
      }

      const csv = ['Data,Dia,Horário,Professor,Aluno,Status', ...rows].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename=horivoo-agenda.csv',
        },
      });
    }

    return NextResponse.json({ error: 'Formato não suportado' }, { status: 400 });
  } catch (error) {
    console.error('[export GET]', error);
    return NextResponse.json({ error: 'Erro ao exportar' }, { status: 500 });
  }
}
