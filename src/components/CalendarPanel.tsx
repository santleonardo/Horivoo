'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/store';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Holiday { id: string; date: string; name: string; type: string; recurring: boolean }
interface NonClassDay { id: string; date: string; reason: string }
interface BookingInfo { id: string; date: string; startTime: string; endTime: string; studentName: string; teacherName?: string }

export function CalendarPanel() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [nonClassDays, setNonClassDays] = useState<NonClassDay[]>([]);
  const [bookings, setBookings] = useState<BookingInfo[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [month, setMonth] = useState<Date>(new Date());

  const loadNonClassDays = async () => {
    const res = await authFetch('/api/non-class-days');
    const data = await res.json();
    setNonClassDays(data.nonClassDays || []);
  };

  useEffect(() => {
    const y = month.getFullYear();
    const m = month.getMonth() + 1;
    let cancelled = false;
    authFetch(`/api/holidays?year=${y}&month=${m}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setHolidays(d.holidays || []); });
    authFetch('/api/non-class-days')
      .then(r => r.json())
      .then(d => { if (!cancelled) setNonClassDays(d.nonClassDays || []); });
    return () => { cancelled = true; };
  }, [month]);

  useEffect(() => {
    const ws = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
    let cancelled = false;
    authFetch(`/api/bookings?weekStart=${ws}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setBookings(d.bookings || []); });
    return () => { cancelled = true; };
  }, [selectedDate]);

  const isHoliday = (date: Date) => holidays.some(h => h.date === format(date, 'yyyy-MM-dd'));
  const isNonClassDay = (date: Date) => nonClassDays.some(n => n.date === format(date, 'yyyy-MM-dd'));
  const getHoliday = (date: Date) => holidays.find(h => h.date === format(date, 'yyyy-MM-dd'));
  const getNonClassDay = (date: Date) => nonClassDays.find(n => n.date === format(date, 'yyyy-MM-dd'));
  const getBookingsForDate = (date: Date) => bookings.filter(b => b.date === format(date, 'yyyy-MM-dd'));

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedHoliday = holidays.find(h => h.date === selectedDateStr);
  const selectedNCD = nonClassDays.find(n => n.date === selectedDateStr);
  const selectedBookings = bookings.filter(b => b.date === selectedDateStr);

  // Custom day content for calendar
  const modifiers = {
    holiday: (date: Date) => isHoliday(date),
    nonClassDay: (date: Date) => isNonClassDay(date),
    hasBookings: (date: Date) => getBookingsForDate(date).length > 0,
  };

  const modifiersClassNames = {
    holiday: 'bg-amber-100 text-amber-800 font-bold',
    nonClassDay: 'bg-orange-100 text-orange-800',
    hasBookings: 'bg-blue-50 text-blue-800 font-semibold',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Calendar */}
        <Card>
          <CardHeader><CardTitle>Calendário</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => { if (d) { setSelectedDate(d); setDetailOpen(true); } }}
              onMonthChange={setMonth}
              month={month}
              locale={ptBR}
              modifiers={modifiers}
              modifiersClassNames={modifiersClassNames}
              className="rounded-md border"
              classNames={{
                months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                month: 'space-y-4',
                caption: 'flex justify-center pt-1 relative items-center',
                caption_label: 'text-sm font-medium',
                nav: 'space-x-1 flex items-center',
                nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                nav_button_previous: 'absolute left-1',
                nav_button_next: 'absolute right-1',
                table: 'w-full border-collapse space-y-1',
                head_row: 'flex',
                head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
                row: 'flex w-full mt-2',
                cell: 'h-9 w-9 text-center text-sm p-0 relative',
                day: 'h-9 w-9 p-0 font-normal rounded-md hover:bg-accent hover:text-accent-foreground',
                day_selected: 'bg-emerald-700 text-white hover:bg-emerald-800',
                day_today: 'bg-emerald-100 text-emerald-800 font-bold',
                day_outside: 'text-muted-foreground opacity-50',
                day_disabled: 'text-muted-foreground opacity-50',
              }}
            />
          </CardContent>
        </Card>

        {/* Legend + Info */}
        <Card>
          <CardHeader><CardTitle>Legenda</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-amber-100 border border-amber-300 inline-block"></span>
                <span className="text-sm">Feriado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-orange-100 border border-orange-300 inline-block"></span>
                <span className="text-sm">Dia sem aula (recesso)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-blue-50 border border-blue-200 inline-block"></span>
                <span className="text-sm">Tem agendamentos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300 inline-block"></span>
                <span className="text-sm">Hoje</span>
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="text-sm font-semibold mb-2">Feriados do Mês</h4>
              {holidays.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum feriado neste mês.</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {holidays.map(h => (
                    <div key={h.id} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs">
                        {new Date(h.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </Badge>
                      <span>{h.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-3">
              <h4 className="text-sm font-semibold mb-2">Dias sem Aula</h4>
              {nonClassDays.filter(n => {
                const d = new Date(n.date + 'T12:00:00');
                return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
              }).length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum dia sem aula neste mês.</p>
              ) : (
                <div className="space-y-1">
                  {nonClassDays.filter(n => {
                    const d = new Date(n.date + 'T12:00:00');
                    return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
                  }).map(n => (
                    <div key={n.id} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                        {new Date(n.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </Badge>
                      <span>{n.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedHoliday && (
              <div className="bg-amber-50 p-3 rounded border border-amber-200">
                <p className="font-semibold text-amber-800">Feriado: {selectedHoliday.name}</p>
                <p className="text-sm text-amber-600">Tipo: {selectedHoliday.type}</p>
              </div>
            )}
            {selectedNCD && (
              <div className="bg-orange-50 p-3 rounded border border-orange-200">
                <p className="font-semibold text-orange-800">Dia sem aula</p>
                <p className="text-sm text-orange-600">{selectedNCD.reason}</p>
              </div>
            )}
            {selectedBookings.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Agendamentos</h4>
                <div className="space-y-1">
                  {selectedBookings.map(b => (
                    <div key={b.id} className="bg-blue-50 p-2 rounded text-sm border border-blue-200">
                      <span className="font-medium">{b.startTime}-{b.endTime}</span>
                      <span className="text-blue-700 ml-2">{b.studentName}</span>
                      {b.teacherName && <span className="text-gray-500 ml-2">({b.teacherName})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!selectedHoliday && !selectedNCD && selectedBookings.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhum evento neste dia.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
