'use client';

/**
 * AgendaPage.tsx — Apenas para coordenadores.
 * Agendamento com verificação de disponibilidade.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, authFetch } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, Check, AlertCircle, User, Loader2, RotateCcw, StickyNote, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface CancelledBooking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  studentName: string;
  teacher?: { name: string };
}

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function AgendaPage() {
  const { user } = useAuthStore();

  // Guard: only coordinator
  if (user?.role !== 'coordinator') {
    return (
      <div className="flex items-center justify-center h-60">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ShieldOff className="size-12 mx-auto mb-3 text-amber-500" />
            <h2 className="text-lg font-semibold text-foreground">Acesso Restrito</h2>
            <p className="text-sm text-muted-foreground mt-1">Acesso restrito a coordenadores</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AgendaContent />;
}

function AgendaContent() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<{ startTime: string; endTime: string; available: boolean; reason?: string }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isReposition, setIsReposition] = useState(false);
  const [originalBookingId, setOriginalBookingId] = useState('');
  const [cancelledBookings, setCancelledBookings] = useState<CancelledBooking[]>([]);
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [teachersRes, studentsRes] = await Promise.all([
        authFetch('/api/teachers'),
        authFetch('/api/students'),
      ]);
      const teachersData = await teachersRes.json();
      const studentsData = await studentsRes.json();

      // Enrich teachers with available slots
      const rawTeachers: Teacher[] = teachersData.teachers || [];
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

      setStudents(studentsData.students || []);
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load cancelled bookings when reposition checkbox is checked
  useEffect(() => {
    if (isReposition) {
      authFetch('/api/bookings?status=cancelled')
        .then(r => r.json())
        .then(data => setCancelledBookings(data.bookings || []))
        .catch(() => setCancelledBookings([]));
    }
  }, [isReposition]);

  // When teacher or date changes, compute available slots with availability checks
  useEffect(() => {
    if (!selectedTeacher || !selectedDate) {
      setAvailableSlots([]);
      return;
    }

    const computeSlots = async () => {
      const teacher = teachers.find(t => t.id === selectedTeacher);
      if (!teacher) return;

      const dateObj = new Date(selectedDate + 'T12:00:00');
      const dayOfWeek = dateObj.getDay();

      const daySlots = (teacher.availableSlots || [])
        .filter(s => s.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      if (daySlots.length === 0) {
        setAvailableSlots([]);
        return;
      }

      // Check for conflicts: bookings, blocked slots, holidays, recesses
      try {
        const [bookingsRes, blockedRes, holidaysRes, recessesRes] = await Promise.all([
          authFetch(`/api/bookings?teacherId=${selectedTeacher}&date=${selectedDate}`),
          authFetch(`/api/blocked-slots?teacherId=${selectedTeacher}&date=${selectedDate}`),
          authFetch(`/api/holidays?year=${selectedDate.substring(0, 4)}&month=${selectedDate.substring(5, 7)}`),
          authFetch('/api/recesses'),
        ]);

        const bookingsData = await bookingsRes.json();
        const blockedData = await blockedRes.json();
        const holidaysData = await holidaysRes.json();
        const recessesData = await recessesRes.json();

        const bookedSlots = new Set(
          (bookingsData.bookings || [])
            .filter((b: { status: string }) => b.status === 'confirmed')
            .map((b: { startTime: string; endTime: string }) => `${b.startTime}-${b.endTime}`)
        );

        const blockedSlotKeys = new Set(
          (blockedData.blockedSlots || []).map((b: { startTime: string; endTime: string }) => `${b.startTime}-${b.endTime}`)
        );

        const isHoliday = (holidaysData.holidays || []).some((h: { date: string }) => h.date === selectedDate);
        const isRecess = (recessesData.recesses || []).some(
          (r: { startDate: string; endDate: string }) => selectedDate >= r.startDate && selectedDate <= r.endDate
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

    computeSlots();
  }, [selectedTeacher, selectedDate, teachers, refreshKey]);

  const handleBooking = async () => {
    if (!selectedTeacher || !selectedDate || !selectedSlot || !selectedStudent) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (isReposition && !originalBookingId) {
      toast.error('Selecione a aula cancelada para a reposição');
      return;
    }
    const student = students.find(s => s.id === selectedStudent);
    if (!student) return;

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        teacherId: selectedTeacher,
        studentName: student.name,
        studentEmail: student.email,
        studentProfileId: student.id,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        notes,
        bookingType: isReposition ? 'reposition' : 'normal',
      };
      if (isReposition) body.originalBookingId = originalBookingId;

      const res = await authFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar agendamento');

      toast.success(isReposition ? 'Reposição agendada com sucesso!' : 'Agendamento criado com sucesso!');
      setSelectedSlot(null);
      setNotes('');
      setIsReposition(false);
      setOriginalBookingId('');
      setRefreshKey(k => k + 1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar agendamento');
    } finally {
      setSubmitting(false);
    }
  };

  const teacher = teachers.find(t => t.id === selectedTeacher);

  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i);
    return {
      value: format(d, 'yyyy-MM-dd'),
      label: format(d, "dd/MM · EEE", { locale: ptBR }),
      dayOfWeek: d.getDay(),
    };
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-40 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        <p className="text-muted-foreground">Agende horários de forma rápida e fácil</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Select Teacher */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">1</div>
              <CardTitle className="text-base">Professor</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Select value={selectedTeacher} onValueChange={v => { setSelectedTeacher(v); setSelectedSlot(null); }}>
              <SelectTrigger><SelectValue placeholder="Selecione o professor" /></SelectTrigger>
              <SelectContent>
                {teachers.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}{t.subjects ? ` — ${t.subjects.split(',').slice(0, 2).join(', ')}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teacher?.subjects && (
              <div className="flex flex-wrap gap-1 mt-3">
                {teacher.subjects.split(',').filter(Boolean).map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{s.trim()}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Select Date */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">2</div>
              <CardTitle className="text-base">Data</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(null); }} min={format(new Date(), 'yyyy-MM-dd')} />
            <div className="flex flex-wrap gap-1 mt-3">
              {dates.map(d => (
                <Button key={d.value} variant={selectedDate === d.value ? 'default' : 'outline'} size="sm"
                  className={`text-xs h-8 ${selectedDate === d.value ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  onClick={() => { setSelectedDate(d.value); setSelectedSlot(null); }}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Select Student */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">3</div>
              <CardTitle className="text-base">Aluno</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
              <SelectContent>
                {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Reposition & Notes Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="size-4 text-emerald-600" />
            Detalhes Adicionais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                      {b.date} • {b.startTime}-{b.endTime} • {b.studentName} • {b.teacher?.name || 'Professor'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-1"><StickyNote className="size-4" /> Observações</Label>
            <Textarea placeholder="Ex: Matéria, livro, capítulo, tema da aula..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Available Slots */}
      {selectedTeacher && selectedDate && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">4</div>
              <div>
                <CardTitle className="text-base">Horários Disponíveis</CardTitle>
                <CardDescription>
                  {format(parseISO(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} — {teacher?.name}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {availableSlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="size-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum horário disponível nesta data</p>
                <p className="text-xs mt-1">
                  O professor pode não ter disponibilidade no {dayNames[new Date(selectedDate + 'T12:00:00').getDay()]}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {availableSlots.map(slot => (
                  <Button
                    key={`${slot.startTime}-${slot.endTime}`}
                    variant={selectedSlot?.startTime === slot.startTime && selectedSlot?.endTime === slot.endTime ? 'default' : 'outline'}
                    className={`h-auto py-3 flex flex-col gap-1 ${
                      !slot.available
                        ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
                        : selectedSlot?.startTime === slot.startTime && selectedSlot?.endTime === slot.endTime
                        ? isReposition ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'hover:bg-emerald-50 hover:border-emerald-200'
                    }`}
                    disabled={!slot.available}
                    onClick={() => slot.available && setSelectedSlot({ startTime: slot.startTime, endTime: slot.endTime })}
                  >
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      <span className="font-medium text-sm">{slot.startTime} - {slot.endTime}</span>
                    </div>
                    {!slot.available && slot.reason && <span className="text-xs opacity-70">{slot.reason}</span>}
                    {slot.available && <span className="text-xs opacity-70">Disponível</span>}
                  </Button>
                ))}
              </div>
            )}

            {selectedSlot && (
              <div className={`mt-4 p-4 rounded-lg border ${isReposition ? 'bg-purple-50 border-purple-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <Check className={`size-5 ${isReposition ? 'text-purple-600' : 'text-emerald-600'}`} />
                    <div>
                      <p className={`font-medium ${isReposition ? 'text-purple-800' : 'text-emerald-800'}`}>
                        {selectedSlot.startTime} - {selectedSlot.endTime}
                      </p>
                      <p className={`text-sm ${isReposition ? 'text-purple-600' : 'text-emerald-600'}`}>
                        {teacher?.name} • {students.find(s => s.id === selectedStudent)?.name || 'Selecione um aluno'}
                        {isReposition && ' • Reposição'}
                      </p>
                      {notes && <p className="text-xs text-muted-foreground mt-1">{notes}</p>}
                    </div>
                  </div>
                  <Button onClick={handleBooking} disabled={!selectedStudent || submitting}
                    className={isReposition ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                  >
                    {submitting ? <Loader2 className="size-4 mr-2 animate-spin" />
                      : isReposition ? <RotateCcw className="size-4 mr-2" /> : <Check className="size-4 mr-2" />}
                    {isReposition ? 'Confirmar Reposição' : 'Confirmar Agendamento'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedTeacher && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <AlertCircle className="size-12 mx-auto mb-3 opacity-30" />
            <p>Selecione um professor para ver os horários disponíveis</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
