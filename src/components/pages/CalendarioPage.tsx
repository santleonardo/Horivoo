'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Clock,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  parseISO,
  isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Holiday {
  id: string;
  date: string;
  name: string;
  type: string;
  recurring: boolean;
}

interface Recess {
  id: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Booking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  studentName: string;
  teacherName?: string;
  status: string;
  teacher?: { name: string };
}

interface Teacher {
  id: string;
  name: string;
  availableSlots: { dayOfWeek: number }[];
}

interface DayDetail {
  date: string;
  bookings: Booking[];
  holidays: Holiday[];
  recesses: Recess[];
  isAvailable: boolean;
}

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function CalendarioPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [recesses, setRecesses] = useState<Recess[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [addHolidayOpen, setAddHolidayOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: '', name: '', type: 'nacional', recurring: false });

  useEffect(() => {
    Promise.all([
      fetch('/api/holidays').then((r) => r.json()),
      fetch('/api/recesses').then((r) => r.json()),
      fetch('/api/calendar').then((r) => r.json()),
    ])
      .then(([hData, rData, cData]) => {
        setHolidays(hData.holidays || []);
        setRecesses(rData.recesses || []);
        setBookings(cData.bookings || []);
        setTeachers(cData.teachers || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month to align with week days
  const startDay = getDay(monthStart);
  const paddedDays = [...Array(startDay).fill(null), ...days];

  const getDayInfo = (date: Date): DayDetail => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayBookings = bookings.filter((b) => b.date === dateStr);
    const dayHolidays = holidays.filter((h) => h.date === dateStr);
    const dayRecesses = recesses.filter(
      (r) => dateStr >= r.startDate && dateStr <= r.endDate
    );
    const dow = getDay(date);
    const hasAvailableSlots = teachers.some((t) =>
      t.availableSlots.some((s) => s.dayOfWeek === dow)
    );

    return {
      date: dateStr,
      bookings: dayBookings,
      holidays: dayHolidays,
      recesses: dayRecesses,
      isAvailable: hasAvailableSlots,
    };
  };

  const getDayColor = (dayInfo: DayDetail) => {
    if (dayInfo.holidays.length > 0 || dayInfo.recesses.length > 0) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (dayInfo.bookings.length > 0) return 'bg-blue-50 text-blue-800 border-blue-200';
    if (dayInfo.isAvailable) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    return 'bg-white text-foreground border-border';
  };

  const handleDayClick = (dayInfo: DayDetail) => {
    setSelectedDay(dayInfo);
    setDayDetailOpen(true);
  };

  const handleAddHoliday = async () => {
    if (!holidayForm.date || !holidayForm.name) {
      toast.error('Preencha todos os campos');
      return;
    }
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayForm),
      });
      if (!res.ok) throw new Error();
      toast.success('Feriado adicionado');
      setAddHolidayOpen(false);
      setHolidayForm({ date: '', name: '', type: 'nacional', recurring: false });
      // Reload holidays
      const hData = await fetch('/api/holidays').then((r) => r.json());
      setHolidays(hData.holidays || []);
    } catch {
      toast.error('Erro ao adicionar feriado');
    }
  };

  const monthLabel = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR });

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-96 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendário</h1>
          <p className="text-muted-foreground">Visão mensal de horários e eventos</p>
        </div>
        <Button
          onClick={() => setAddHolidayOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <PartyPopper className="size-4 mr-2" />
          Adicionar Feriado
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-200 border border-emerald-300" />
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-200 border border-blue-300" />
          <span>Agendado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-200 border border-amber-300" />
          <span>Feriado/Recesso</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-200 border border-red-300" />
          <span>Bloqueado</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="size-5" />
            </Button>
            <CardTitle className="text-lg capitalize">{monthLabel}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {paddedDays.map((day, i) => {
              if (!day) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }

              const dayInfo = getDayInfo(day);
              const today = isToday(day);
              const colorClass = getDayColor(dayInfo);

              return (
                <button
                  key={format(day, 'yyyy-MM-dd')}
                  className={`aspect-square rounded-lg border p-1 text-left transition-all hover:shadow-md cursor-pointer ${colorClass} ${
                    today ? 'ring-2 ring-emerald-500 ring-offset-1' : ''
                  }`}
                  onClick={() => handleDayClick(dayInfo)}
                >
                  <div className="flex flex-col h-full">
                    <span className={`text-xs font-medium ${today ? 'text-emerald-700' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex-1 flex flex-col gap-0.5 overflow-hidden mt-0.5">
                      {dayInfo.holidays.length > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 self-center" />
                      )}
                      {dayInfo.bookings.length > 0 && (
                        <div className="flex flex-wrap gap-0.5">
                          {dayInfo.bookings.slice(0, 2).map((_, idx) => (
                            <div key={idx} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          ))}
                          {dayInfo.bookings.length > 2 && (
                            <span className="text-[8px] text-blue-600">+{dayInfo.bookings.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog open={dayDetailOpen} onOpenChange={setDayDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-emerald-600" />
              {selectedDay && format(parseISO(selectedDay.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>

          {selectedDay && (
            <div className="space-y-4">
              {/* Holidays */}
              {selectedDay.holidays.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-amber-600">Feriados</Label>
                  {selectedDay.holidays.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 p-2 rounded bg-amber-50 text-sm">
                      <PartyPopper className="size-4 text-amber-500" />
                      <span className="font-medium">{h.name}</span>
                      <Badge variant="secondary" className="text-xs">{h.type}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Recesses */}
              {selectedDay.recesses.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-amber-600">Recessos</Label>
                  {selectedDay.recesses.map((r) => (
                    <div key={r.id} className="p-2 rounded bg-amber-50 text-sm">
                      <span className="font-medium">{r.description}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {r.startDate} — {r.endDate}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Bookings */}
              <div className="space-y-2">
                <Label>Agendamentos ({selectedDay.bookings.length})</Label>
                {selectedDay.bookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum agendamento nesta data</p>
                ) : (
                  selectedDay.bookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 p-2 rounded bg-muted/50 text-sm">
                      <Clock className="size-4 text-emerald-500 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">{b.startTime} - {b.endTime}</p>
                        <p className="text-xs text-muted-foreground">
                          <User className="size-3 inline mr-1" />
                          {b.studentName} • {b.teacher?.name || 'Professor'}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          b.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : b.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {b.status === 'confirmed' ? 'Confirmado' : b.status === 'cancelled' ? 'Cancelado' : 'Concluído'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Holiday Dialog */}
      <Dialog open={addHolidayOpen} onOpenChange={setAddHolidayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Feriado</DialogTitle>
            <DialogDescription>Adicione um novo feriado ao calendário</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={holidayForm.date}
                onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Nome do feriado"
                value={holidayForm.name}
                onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={holidayForm.type} onValueChange={(v) => setHolidayForm({ ...holidayForm, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nacional">Nacional</SelectItem>
                  <SelectItem value="estadual">Estadual</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={holidayForm.recurring}
                onChange={(e) => setHolidayForm({ ...holidayForm, recurring: e.target.checked })}
                className="rounded border-input"
              />
              <Label htmlFor="recurring">Recorrente (todos os anos)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddHolidayOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddHoliday} className="bg-emerald-600 hover:bg-emerald-700">
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
