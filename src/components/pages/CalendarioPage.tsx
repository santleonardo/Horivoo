'use client';

/**
 * CalendarioPage.tsx — Calendário integrado com todos os tipos de evento.
 * Aulas (bookings) - azul
 * Provas (tests) - purple
 * Reposições (repositions) - orange
 * Feriados (holidays) - amber
 * Recessos (recesses) - red
 *
 * Apenas coordenador pode criar agendamentos.
 * Professor e aluno veem calendário somente leitura.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuthStore, authFetch } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Clock,
  User,
  Plus,
  RotateCcw,
  Loader2,
  StickyNote,
  FileText,
  Palmtree,
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
  parseISO,
  isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ------------------------------------------------------------------ */

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
  bookingType?: string;
  originalBookingId?: string;
  notes?: string;
  teacher?: { name: string };
}

interface Test {
  id: string;
  title: string;
  date: string;
  className?: string;
  class?: { name: string; subject: string };
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects: string;
  availableSlots: { id: string; dayOfWeek: number; startTime: string; endTime: string }[];
}

interface Student {
  id: string;
  name: string;
  email: string;
}

interface DayEvent {
  type: 'booking' | 'test' | 'reposition' | 'holiday' | 'recess';
  label: string;
  detail?: string;
  data?: unknown;
}

interface DayDetail {
  date: string;
  bookings: Booking[];
  tests: Test[];
  holidays: Holiday[];
  recesses: Recess[];
  isAvailable: boolean;
}

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const eventColors: Record<string, string> = {
  booking: 'bg-blue-500',
  test: 'bg-purple-500',
  reposition: 'bg-orange-500',
  holiday: 'bg-amber-500',
  recess: 'bg-red-500',
};

const eventColorsLight: Record<string, string> = {
  booking: 'bg-blue-50 border-blue-200 text-blue-800',
  test: 'bg-purple-50 border-purple-200 text-purple-800',
  reposition: 'bg-orange-50 border-orange-200 text-orange-800',
  holiday: 'bg-amber-50 border-amber-200 text-amber-800',
  recess: 'bg-red-50 border-red-200 text-red-800',
};

/* ------------------------------------------------------------------ */

export function CalendarioPage() {
  const { user } = useAuthStore();
  const isCoordinator = user?.role === 'coordinator';

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [recesses, setRecesses] = useState<Recess[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [addHolidayOpen, setAddHolidayOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: '', name: '', type: 'nacional', recurring: false });

  // Booking dialog state (coordinator only)
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingTeacher, setBookingTeacher] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingStartTime, setBookingStartTime] = useState('');
  const [bookingEndTime, setBookingEndTime] = useState('');
  const [bookingStudent, setBookingStudent] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isReposition, setIsReposition] = useState(false);
  const [originalBookingId, setOriginalBookingId] = useState('');
  const [cancelledBookings, setCancelledBookings] = useState<Booking[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [availableSlots, setAvailableSlots] = useState<{ startTime: string; endTime: string; available: boolean; reason?: string }[]>([]);

  const timeOptions = useMemo(() => {
    const options: string[] = [];
    for (let h = 6; h <= 22; h++) {
      for (let m = 0; m < 60; m += 15) {
        options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    options.push('23:00');
    return options;
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [hData, rData, cData, sData, tData] = await Promise.all([
        authFetch('/api/holidays').then(r => r.json()),
        authFetch('/api/recesses').then(r => r.json()),
        authFetch('/api/calendar').then(r => r.json()),
        authFetch('/api/students').then(r => r.json()),
        authFetch('/api/tests').then(r => r.json()),
      ]);
      setHolidays(hData.holidays || []);
      setRecesses(rData.recesses || []);
      setBookings(cData.appointments || []);
      setStudents(sData.students || []);
      setTests(tData.tests || []);

      const rawTeachers: Teacher[] = cData.teachers || [];
      if (rawTeachers.length > 0) {
        const slotResults = await Promise.all(
          rawTeachers.map(t =>
            authFetch(`/api/teachers/${t.id}/available-slots`)
              .then(r => r.json())
              .catch(() => ({ slots: [] }))
          )
        );
        const enriched = rawTeachers.map((t, i) => ({
          ...t,
          availableSlots: (slotResults[i]?.slots || []).map(
            (s: { id: string; day_of_week: number; start_time: string; end_time: string }) => ({
              id: s.id,
              dayOfWeek: s.day_of_week,
              startTime: s.start_time,
              endTime: s.end_time,
            })
          ),
        }));
        setTeachers(enriched);
      } else {
        setTeachers([]);
      }
    } catch {
      toast.error('Erro ao carregar dados do calendário');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Available slots for booking (coordinator only)
  useEffect(() => {
    if (!bookingTeacher || !bookingDate) { setAvailableSlots([]); return; }
    const teacher = teachers.find(t => t.id === bookingTeacher);
    if (!teacher) { setAvailableSlots([]); return; }

    const dateObj = new Date(bookingDate + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();
    const daySlots = (teacher.availableSlots || [])
      .filter(s => s.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (daySlots.length === 0) { setAvailableSlots([]); return; }

    const computeAvailability = async () => {
      try {
        const [bookingsRes, blockedRes, holidaysRes, recessesRes] = await Promise.all([
          authFetch(`/api/appointments?teacherId=${bookingTeacher}&date=${bookingDate}`),
          authFetch(`/api/appointments?teacherId=${bookingTeacher}&date=${bookingDate}`),
          authFetch(`/api/holidays?year=${bookingDate.substring(0, 4)}&month=${bookingDate.substring(5, 7)}`),
          authFetch('/api/recesses'),
        ]);

        const bookingsData = await bookingsRes.json();
        const blockedData = await blockedRes.json();
        const holidaysData = await holidaysRes.json();
        const recessesData = await recessesRes.json();

        const bookedSlots = new Set(
          (bookingsData.appointments || [])
            .filter((b: { status: string }) => b.status === 'confirmed')
            .map((b: { startTime: string; endTime: string }) => `${b.startTime}-${b.endTime}`)
        );
        const blockedSlotKeys = new Set(
          (blockedData.blockedSlots || []).map((b: { startTime: string; endTime: string }) => `${b.startTime}-${b.endTime}`)
        );
        const isHoliday = (holidaysData.holidays || []).some((h: { date: string }) => h.date === bookingDate);
        const isRecess = (recessesData.recesses || []).some(
          (r: { startDate: string; endDate: string }) => bookingDate >= r.startDate && bookingDate <= r.endDate
        );

        const slots = daySlots.map(slot => {
          const key = `${slot.startTime}-${slot.endTime}`;
          let available = true;
          let reason: string | undefined;
          if (isHoliday) { available = false; reason = 'Feriado'; }
          else if (isRecess) { available = false; reason = 'Recesso'; }
          else if (blockedSlotKeys.has(key)) { available = false; reason = 'Bloqueado'; }
          else if (bookedSlots.has(key)) { available = false; reason = 'Já agendado'; }
          return { startTime: slot.startTime, endTime: slot.endTime, available, reason };
        });
        setAvailableSlots(slots);
      } catch {
        setAvailableSlots(daySlots.map(s => ({ startTime: s.startTime, endTime: s.endTime, available: true })));
      }
    };
    computeAvailability();
  }, [bookingTeacher, bookingDate, teachers]);

  // Load cancelled bookings for reposition
  useEffect(() => {
    if (isReposition) {
      authFetch('/api/appointments?status=cancelled')
        .then(r => r.json())
        .then(data => setCancelledBookings(data.appointments || []))
        .catch(() => setCancelledBookings([]));
    }
  }, [isReposition]);

  const endTimeOptions = useMemo(() => {
    if (!bookingStartTime) return timeOptions;
    return timeOptions.filter(t => t > bookingStartTime);
  }, [bookingStartTime, timeOptions]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);
  const paddedDays = [...Array(startDay).fill(null), ...days];

  const getDayInfo = (date: Date): DayDetail => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayBookings = bookings.filter(b => b.date === dateStr);
    const dayHolidays = holidays.filter(h => h.date === dateStr);
    const dayRecesses = recesses.filter(r => dateStr >= r.startDate && dateStr <= r.endDate);
    const dayTests = tests.filter(t => t.date === dateStr);
    const dow = getDay(date);
    const hasAvailableSlots = Array.isArray(teachers) && teachers.some(t =>
      Array.isArray(t.availableSlots) && t.availableSlots.some(s => s.dayOfWeek === dow)
    );
    return {
      date: dateStr,
      bookings: dayBookings,
      tests: dayTests,
      holidays: dayHolidays,
      recesses: dayRecesses,
      isAvailable: hasAvailableSlots,
    };
  };

  const getDayEvents = (dayInfo: DayDetail): DayEvent[] => {
    const events: DayEvent[] = [];
    dayInfo.holidays.forEach(h => events.push({ type: 'holiday', label: h.name, data: h }));
    dayInfo.recesses.forEach(r => events.push({ type: 'recess', label: r.description, data: r }));
    dayInfo.bookings.forEach(b => {
      if (b.bookingType === 'reposition') {
        events.push({ type: 'reposition', label: `${b.startTime}-${b.endTime}`, detail: b.studentName, data: b });
      } else {
        events.push({ type: 'booking', label: `${b.startTime}-${b.endTime}`, detail: b.studentName, data: b });
      }
    });
    dayInfo.tests.forEach(t => events.push({ type: 'test', label: t.title, data: t }));
    return events;
  };

  const getDayColor = (dayInfo: DayDetail) => {
    const events = getDayEvents(dayInfo);
    if (events.some(e => e.type === 'holiday' || e.type === 'recess')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (events.length > 0) return 'bg-blue-50 text-blue-800 border-blue-200';
    if (dayInfo.isAvailable) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    return 'bg-white text-foreground border-border';
  };

  const handleDayClick = (dayInfo: DayDetail) => {
    setSelectedDay(dayInfo);
    setDayDetailOpen(true);
  };

  const handleAddHoliday = async () => {
    if (!holidayForm.date || !holidayForm.name) { toast.error('Preencha todos os campos'); return; }
    try {
      const res = await authFetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayForm),
      });
      if (!res.ok) throw new Error();
      toast.success('Feriado adicionado');
      setAddHolidayOpen(false);
      setHolidayForm({ date: '', name: '', type: 'nacional', recurring: false });
      const hData = await authFetch('/api/holidays').then(r => r.json());
      setHolidays(hData.holidays || []);
    } catch { toast.error('Erro ao adicionar feriado'); }
  };

  const openBookingDialog = (date?: string) => {
    if (!isCoordinator) return;
    setBookingTeacher('');
    setBookingDate(date || '');
    setBookingStartTime('');
    setBookingEndTime('');
    setBookingStudent('');
    setBookingNotes('');
    setIsReposition(false);
    setOriginalBookingId('');
    setBookingOpen(true);
  };

  const handleCreateBooking = async () => {
    if (!bookingTeacher || !bookingDate || !bookingStartTime || !bookingEndTime || !bookingStudent) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (isReposition && !originalBookingId) {
      toast.error('Selecione o agendamento cancelado para a reposição');
      return;
    }
    const student = students.find(s => s.id === bookingStudent);
    if (!student) { toast.error('Selecione um aluno válido'); return; }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        teacherId: bookingTeacher,
        studentName: student.name,
        studentEmail: student.email,
        studentProfileId: student.id,
        date: bookingDate,
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        notes: bookingNotes,
        bookingType: isReposition ? 'reposition' : 'normal',
      };
      if (isReposition) body.originalBookingId = originalBookingId;

      const res = await authFetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar agendamento');
      toast.success(isReposition ? 'Reposição agendada com sucesso!' : 'Agendamento criado com sucesso!');
      setBookingOpen(false);
      setDayDetailOpen(false);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar agendamento');
    } finally {
      setSubmitting(false);
    }
  };

  const monthLabel = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR });

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse"><CardContent className="p-6"><div className="h-96 bg-muted rounded" /></CardContent></Card>
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
          {isCoordinator && (
            <>
              <Button onClick={() => openBookingDialog()} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="size-4 mr-2" />
                Novo Agendamento
              </Button>
              <Button variant="outline" onClick={() => setAddHolidayOpen(true)}>
                <PartyPopper className="size-4 mr-2" />
                Adicionar Feriado
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-200 border border-emerald-300" />
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Aulas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span>Provas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span>Reposições</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span>Feriados</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Recessos</span>
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
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {paddedDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="aspect-square" />;
              const dayInfo = getDayInfo(day);
              const events = getDayEvents(dayInfo);
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
                      {events.slice(0, 3).map((ev, idx) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${eventColors[ev.type]} self-center`}
                        />
                      ))}
                      {events.length > 3 && (
                        <span className="text-[8px] text-muted-foreground">+{events.length - 3}</span>
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
                  <Label className="text-amber-600 flex items-center gap-1"><PartyPopper className="size-4" /> Feriados</Label>
                  {selectedDay.holidays.map(h => (
                    <div key={h.id} className="flex items-center gap-2 p-2 rounded bg-amber-50 text-sm">
                      <span className="font-medium">{h.name}</span>
                      <Badge variant="secondary" className="text-xs">{h.type}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Recesses */}
              {selectedDay.recesses.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-red-600 flex items-center gap-1"><Palmtree className="size-4" /> Recessos</Label>
                  {selectedDay.recesses.map(r => (
                    <div key={r.id} className="p-2 rounded bg-red-50 text-sm">
                      <span className="font-medium">{r.description}</span>
                      <span className="text-xs text-muted-foreground ml-2">{r.startDate} — {r.endDate}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tests */}
              {selectedDay.tests && selectedDay.tests.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-purple-600 flex items-center gap-1"><FileText className="size-4" /> Provas</Label>
                  {selectedDay.tests.map(t => (
                    <div key={t.id} className="flex items-center gap-2 p-2 rounded bg-purple-50 text-sm">
                      <FileText className="size-4 text-purple-500" />
                      <span className="font-medium">{t.title}</span>
                      {t.class?.name && <Badge variant="outline" className="text-xs">{t.class.name}</Badge>}
                    </div>
                  ))}
                </div>
              )}

              {/* Bookings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Agendamentos ({selectedDay.bookings.length})</Label>
                  {isCoordinator && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs" onClick={() => openBookingDialog(selectedDay.date)}>
                      <Plus className="size-3 mr-1" /> Agendar
                    </Button>
                  )}
                </div>
                {selectedDay.bookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum agendamento nesta data</p>
                ) : (
                  selectedDay.bookings.map(b => (
                    <div key={b.id} className="flex items-center gap-3 p-2 rounded bg-muted/50 text-sm">
                      <Clock className={`size-4 shrink-0 ${b.bookingType === 'reposition' ? 'text-orange-500' : 'text-emerald-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{b.startTime} - {b.endTime}</p>
                          {b.bookingType === 'reposition' && (
                            <Badge className="bg-orange-100 text-orange-700 text-xs">
                              <RotateCcw className="size-3 mr-1" /> Reposição
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <User className="size-3 inline mr-1" />
                          {b.studentName} • {b.teacher?.name || 'Professor'}
                        </p>
                        {b.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <StickyNote className="size-3" /> {b.notes}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className={
                        b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700'
                          : b.status === 'cancelled' ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }>
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

      {/* New Booking Dialog (coordinator only) */}
      {isCoordinator && (
        <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="size-5 text-emerald-600" />
                {isReposition ? 'Agendar Reposição' : 'Novo Agendamento'}
              </DialogTitle>
              <DialogDescription>
                {isReposition ? 'Agende uma reposição para uma aula cancelada' : 'Preencha os dados para criar um novo agendamento'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Reposition Checkbox */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-200">
                <Checkbox id="isReposition" checked={isReposition} onCheckedChange={checked => {
                  setIsReposition(checked === true);
                  if (!checked) setOriginalBookingId('');
                }} />
                <div className="flex-1">
                  <Label htmlFor="isReposition" className="cursor-pointer font-medium text-purple-700">
                    <RotateCcw className="size-4 inline mr-1" /> Reposição de Aula
                  </Label>
                  <p className="text-xs text-purple-600">Marque se este agendamento é uma reposição</p>
                </div>
              </div>

              {isReposition && (
                <div className="space-y-2">
                  <Label>Aula Cancelada (Original)</Label>
                  <Select value={originalBookingId} onValueChange={setOriginalBookingId}>
                    <SelectTrigger><SelectValue placeholder="Selecione a aula cancelada" /></SelectTrigger>
                    <SelectContent>
                      {cancelledBookings.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">Nenhuma aula cancelada encontrada</div>
                      ) : cancelledBookings.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.date} • {b.startTime}-{b.endTime} • {b.studentName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Professor *</Label>
                <Select value={bookingTeacher} onValueChange={v => { setBookingTeacher(v); setBookingStartTime(''); setBookingEndTime(''); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione o professor" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}{t.subjects ? ` — ${t.subjects.split(',').slice(0, 2).join(', ')}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={bookingDate} onChange={e => { setBookingDate(e.target.value); setBookingStartTime(''); setBookingEndTime(''); }} min={format(new Date(), 'yyyy-MM-dd')} />
              </div>

              {bookingTeacher && bookingDate && availableSlots.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-emerald-600">Horários Disponíveis</Label>
                  <div className="flex flex-wrap gap-1">
                    {availableSlots.map(slot => (
                      <button
                        key={`${slot.startTime}-${slot.endTime}`}
                        className={`px-2 py-1 rounded text-xs border transition-all ${
                          !slot.available ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed line-through'
                            : bookingStartTime === slot.startTime && bookingEndTime === slot.endTime
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                        }`}
                        disabled={!slot.available}
                        onClick={() => slot.available && (setBookingStartTime(slot.startTime), setBookingEndTime(slot.endTime))}
                      >
                        {slot.startTime}-{slot.endTime}
                        {!slot.available && slot.reason && ` (${slot.reason})`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {bookingTeacher && bookingDate && availableSlots.length === 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                  Nenhum horário disponível para este professor nesta data.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Horário Início *</Label>
                  <Select value={bookingStartTime} onValueChange={v => { setBookingStartTime(v); if (bookingEndTime && bookingEndTime <= v) setBookingEndTime(''); }}>
                    <SelectTrigger><SelectValue placeholder="Início" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {timeOptions.slice(0, -1).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Horário Fim *</Label>
                  <Select value={bookingEndTime} onValueChange={setBookingEndTime}>
                    <SelectTrigger><SelectValue placeholder="Fim" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {endTimeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Aluno *</Label>
                <Select value={bookingStudent} onValueChange={setBookingStudent}>
                  <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1"><StickyNote className="size-4" /> Observações</Label>
                <Textarea placeholder="Ex: Matéria, livro, capítulo..." value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} rows={3} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBookingOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateBooking} disabled={submitting} className={isReposition ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'}>
                {submitting ? <Loader2 className="size-4 mr-2 animate-spin" />
                  : isReposition ? <RotateCcw className="size-4 mr-2" /> : <Plus className="size-4 mr-2" />}
                {isReposition ? 'Agendar Reposição' : 'Criar Agendamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Holiday Dialog (coordinator only) */}
      {isCoordinator && (
        <Dialog open={addHolidayOpen} onOpenChange={setAddHolidayOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Feriado</DialogTitle>
              <DialogDescription>Adicione um novo feriado ao calendário</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={holidayForm.date} onChange={e => setHolidayForm({ ...holidayForm, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Nome do feriado" value={holidayForm.name} onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={holidayForm.type} onValueChange={v => setHolidayForm({ ...holidayForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="estadual">Estadual</SelectItem>
                    <SelectItem value="municipal">Municipal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="recurring" checked={holidayForm.recurring} onCheckedChange={checked => setHolidayForm({ ...holidayForm, recurring: checked === true })} />
                <Label htmlFor="recurring">Recorrente (todos os anos)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddHolidayOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddHoliday} className="bg-emerald-600 hover:bg-emerald-700">Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
