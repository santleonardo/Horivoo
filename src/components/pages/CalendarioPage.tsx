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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Clock,
  User,
  BookOpen,
  Plus,
  Loader2,
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
  notes?: string;
  status: string;
  teacher?: { name: string };
}

interface AvailableSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Teacher {
  id: string;
  name: string;
  availableSlots: AvailableSlot[];
}

interface DayDetail {
  date: string;
  bookings: Booking[];
  holidays: Holiday[];
  recesses: Recess[];
  isAvailable: boolean;
}

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const timeOptions = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00',
];

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

  // Booking dialog state
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTeacherId, setBookingTeacherId] = useState('');
  const [bookingStartTime, setBookingStartTime] = useState('');
  const [bookingEndTime, setBookingEndTime] = useState('');
  const [bookingStudentName, setBookingStudentName] = useState('');
  const [bookingStudentEmail, setBookingStudentEmail] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Available slots for selected teacher on selected day
  const [teacherSlotsForDay, setTeacherSlotsForDay] = useState<AvailableSlot[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/holidays').then((r) => r.json()),
      fetch('/api/recesses').then((r) => r.json()),
      fetch('/api/calendar').then((r) => r.json()),
    ])
      .then(([hData, rData, cData]) => {
        setHolidays(Array.isArray(hData?.holidays) ? hData.holidays : []);
        setRecesses(Array.isArray(rData?.recesses) ? rData.recesses : []);
        setBookings(Array.isArray(cData?.bookings) ? cData.bookings : []);
        setTeachers(
          Array.isArray(cData?.teachers)
            ? cData.teachers.map((t: Teacher) => ({
                ...t,
                availableSlots: Array.isArray(t?.availableSlots) ? t.availableSlots : [],
              }))
            : []
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const reloadData = async () => {
    try {
      const cData = await fetch('/api/calendar').then((r) => r.json());
      setBookings(Array.isArray(cData?.bookings) ? cData.bookings : []);
      setTeachers(
        Array.isArray(cData?.teachers)
          ? cData.teachers.map((t: Teacher) => ({
              ...t,
              availableSlots: Array.isArray(t?.availableSlots) ? t.availableSlots : [],
            }))
          : []
      );
    } catch {
      // ignore
    }
  };

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
    const hasAvailableSlots = Array.isArray(teachers) && teachers.some((t) =>
      Array.isArray(t?.availableSlots) && t.availableSlots.some((s) => s?.dayOfWeek === dow)
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

  // ---- Booking Dialog Logic ----

  const openBookingDialog = (dateStr: string) => {
    setBookingDate(dateStr);
    setBookingTeacherId('');
    setBookingStartTime('');
    setBookingEndTime('');
    setBookingStudentName('');
    setBookingStudentEmail('');
    setBookingNotes('');
    setTeacherSlotsForDay([]);
    setBookingOpen(true);
  };

  // When teacher changes, update available slots for that day
  useEffect(() => {
    if (!bookingTeacherId || !bookingDate) {
      setTeacherSlotsForDay([]);
      return;
    }
    const teacher = teachers.find((t) => t.id === bookingTeacherId);
    if (!teacher) {
      setTeacherSlotsForDay([]);
      return;
    }
    const dow = new Date(bookingDate + 'T12:00:00').getDay();
    const slots = (teacher.availableSlots || []).filter((s) => s.dayOfWeek === dow);
    setTeacherSlotsForDay(slots);
    // Reset time if current selection not in slots
    if (slots.length > 0) {
      const hasMatch = slots.some((s) => s.startTime === bookingStartTime && s.endTime === bookingEndTime);
      if (!hasMatch) {
        setBookingStartTime(slots[0].startTime);
        setBookingEndTime(slots[0].endTime);
      }
    } else {
      setBookingStartTime('');
      setBookingEndTime('');
    }
  }, [bookingTeacherId, bookingDate, teachers]);

  const handleCreateBooking = async () => {
    if (!bookingTeacherId || !bookingStudentName || !bookingDate || !bookingStartTime || !bookingEndTime) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setBookingLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: bookingTeacherId,
          studentName: bookingStudentName,
          studentEmail: bookingStudentEmail || null,
          date: bookingDate,
          startTime: bookingStartTime,
          endTime: bookingEndTime,
          notes: bookingNotes || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao agendar');
        return;
      }
      toast.success('Agendamento realizado com sucesso!');
      setBookingOpen(false);
      reloadData();
      // Update selectedDay bookings
      if (selectedDay) {
        setSelectedDay({
          ...selectedDay,
          bookings: [...selectedDay.bookings, {
            id: data.booking?.id || '',
            date: bookingDate,
            startTime: bookingStartTime,
            endTime: bookingEndTime,
            studentName: bookingStudentName,
            notes: bookingNotes,
            status: 'confirmed',
            teacher: teachers.find((t) => t.id === bookingTeacherId) as any,
          }],
        });
      }
    } catch {
      toast.error('Erro ao agendar');
    } finally {
      setBookingLoading(false);
    }
  };

  const monthLabel = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR });

  // Get unique slot options for the time selectors
  const startTimeOptions = useMemo(() => {
    const starts = new Set(teacherSlotsForDay.map((s) => s.startTime));
    if (starts.size === 0) return timeOptions;
    return [...starts].sort();
  }, [teacherSlotsForDay]);

  const endTimeOptions = useMemo(() => {
    // Show end times that correspond to slots starting at bookingStartTime
    const matching = teacherSlotsForDay.filter((s) => s.startTime === bookingStartTime);
    if (matching.length > 0) return matching.map((s) => s.endTime).sort();
    // Fallback: show all times after start
    return timeOptions.filter((t) => t > (bookingStartTime || '00:00'));
  }, [teacherSlotsForDay, bookingStartTime]);

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
        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (selectedDay) {
                openBookingDialog(selectedDay.date);
              } else {
                openBookingDialog(format(new Date(), 'yyyy-MM-dd'));
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="size-4 mr-2" />
            Novo Agendamento
          </Button>
          <Button
            onClick={() => setAddHolidayOpen(true)}
            variant="outline"
          >
            <PartyPopper className="size-4 mr-2" />
            Feriado
          </Button>
        </div>
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
                <div className="flex items-center justify-between">
                  <Label>Agendamentos ({selectedDay.bookings.length})</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      setDayDetailOpen(false);
                      openBookingDialog(selectedDay.date);
                    }}
                  >
                    <Plus className="size-3 mr-1" />
                    Agendar
                  </Button>
                </div>
                {selectedDay.bookings.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">Nenhum agendamento nesta data</p>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        setDayDetailOpen(false);
                        openBookingDialog(selectedDay.date);
                      }}
                    >
                      <Plus className="size-3 mr-1" />
                      Criar Agendamento
                    </Button>
                  </div>
                ) : (
                  selectedDay.bookings.map((b) => (
                    <div key={b.id} className="flex items-start gap-3 p-3 rounded bg-muted/50 text-sm border">
                      <Clock className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{b.startTime} - {b.endTime}</p>
                        <p className="text-xs text-muted-foreground">
                          <User className="size-3 inline mr-1" />
                          {b.studentName} • {b.teacher?.name || 'Professor'}
                        </p>
                        {b.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <BookOpen className="size-3 inline mr-1" />
                            {b.notes}
                          </p>
                        )}
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

      {/* Booking Dialog */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-emerald-600" />
              Agendar Horário
            </DialogTitle>
            <DialogDescription>
              {bookingDate && format(parseISO(bookingDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Data *</Label>
              <Input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
              />
            </div>

            {/* Teacher */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Professor *</Label>
              <Select value={bookingTeacherId} onValueChange={setBookingTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o professor" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time selection */}
            {bookingTeacherId && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Horário de Início *</Label>
                  {teacherSlotsForDay.length > 0 ? (
                    <Select value={bookingStartTime} onValueChange={(v) => {
                      setBookingStartTime(v);
                      // Auto-set end time to matching slot
                      const match = teacherSlotsForDay.find((s) => s.startTime === v);
                      if (match) setBookingEndTime(match.endTime);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Início" />
                      </SelectTrigger>
                      <SelectContent>
                        {startTimeOptions.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={bookingStartTime} onValueChange={setBookingStartTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Início" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Horário de Fim *</Label>
                  {teacherSlotsForDay.length > 0 ? (
                    <Select value={bookingEndTime} onValueChange={setBookingEndTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Fim" />
                      </SelectTrigger>
                      <SelectContent>
                        {endTimeOptions.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={bookingEndTime} onValueChange={setBookingEndTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Fim" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.filter((t) => t > (bookingStartTime || '00:00')).map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )}

            {bookingTeacherId && bookingDate && teacherSlotsForDay.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                Este professor não tem horários disponíveis no dia selecionado ({weekDays[new Date(bookingDate + 'T12:00:00').getDay()]}).
                Selecione outro professor ou outra data.
              </div>
            )}

            {/* Student name */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Nome do Aluno *</Label>
              <Input
                placeholder="Ex: Maria da Paz"
                value={bookingStudentName}
                onChange={(e) => setBookingStudentName(e.target.value)}
              />
            </div>

            {/* Student email */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">E-mail do Aluno</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com (opcional)"
                value={bookingStudentEmail}
                onChange={(e) => setBookingStudentEmail(e.target.value)}
              />
            </div>

            {/* Notes / Subject / Book */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1">
                <BookOpen className="size-4" />
                Matéria / Livro / Observações
              </Label>
              <Textarea
                placeholder="Ex: Livro 1 - Teens, Aula de inglês, Capítulo 3..."
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Campo livre para o coordenador anotar matéria, livro, capítulo ou outras informações.
              </p>
            </div>

            {/* Summary */}
            {bookingTeacherId && bookingDate && bookingStartTime && bookingEndTime && bookingStudentName && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-sm font-medium text-emerald-800">
                  Resumo do Agendamento
                </p>
                <div className="mt-1 text-sm text-emerald-700 space-y-0.5">
                  <p>
                    <User className="size-3 inline mr-1" />
                    <strong>Professor:</strong> {teachers.find((t) => t.id === bookingTeacherId)?.name}
                  </p>
                  <p>
                    <CalendarDays className="size-3 inline mr-1" />
                    <strong>Data:</strong> {format(parseISO(bookingDate), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                  </p>
                  <p>
                    <Clock className="size-3 inline mr-1" />
                    <strong>Horário:</strong> {bookingStartTime} - {bookingEndTime}
                  </p>
                  <p>
                    <User className="size-3 inline mr-1" />
                    <strong>Aluno:</strong> {bookingStudentName}
                  </p>
                  {bookingNotes && (
                    <p>
                      <BookOpen className="size-3 inline mr-1" />
                      <strong>Obs:</strong> {bookingNotes}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setBookingOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateBooking}
              disabled={bookingLoading || !bookingTeacherId || !bookingStudentName || !bookingStartTime || !bookingEndTime}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {bookingLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Agendando...
                </>
              ) : (
                'Confirmar Agendamento'
              )}
            </Button>
          </DialogFooter>
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
