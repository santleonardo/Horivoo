'use client';

/**
 * MinhaAgendaPage.tsx
 * Página exclusiva do professor: visualiza a própria agenda — SOMENTE LEITURA.
 * Sem botão de agendamento, sem modal de booking, sem cancelar/reagendar.
 * Mostra: próximas aulas, reposições, agendamentos recorrentes, resumo de disponibilidade.
 * Clique para ver detalhes apenas (sem edição).
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, authFetch } from '@/lib/store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  User,
  Loader2,
  RotateCcw,
  CheckCircle,
  XCircle,
  CalendarClock,
  StickyNote,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  format,
  parseISO,
  isToday,
  isFuture,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ------------------------------------------------------------------ */

interface Booking {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  booking_type: string;
  notes: string;
  studentName: string;
  studentEmail: string;
  className?: string;
  teacher?: { name: string };
}

interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  confirmed:   { label: 'Confirmada',  color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled:   { label: 'Cancelada',   color: 'bg-red-100 text-red-700',         icon: XCircle },
  completed:   { label: 'Concluída',   color: 'bg-gray-100 text-gray-700',       icon: CheckCircle },
  reposition:  { label: 'Reposição',   color: 'bg-amber-100 text-amber-700',     icon: RotateCcw },
};

const typeLabel: Record<string, string> = {
  normal:     'Aula',
  recurring:  'Recorrente',
  reposition: 'Reposição',
  makeup:     'Reposição',
};

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/* ------------------------------------------------------------------ */

export function MinhaAgendaPage() {
  const { user } = useAuthStore();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  /* ---- Find teacher profile ---- */
  useEffect(() => {
    if (!user) return;
    if (user.teacherId) {
      setTeacherId(user.teacherId);
      return;
    }
    authFetch('/api/teachers')
      .then(r => r.json())
      .then(data => {
        const mine = (data.teachers || []).find(
          (t: { id: string; name: string; email: string }) =>
            t.email === user.email || t.name === user.name
        );
        if (mine) setTeacherId(mine.id);
      })
      .catch(() => {});
  }, [user]);

  /* ---- Load bookings ---- */
  useEffect(() => {
    if (!teacherId) return;
    setLoading(true);

    const from = format(startOfMonth(viewMonth), 'yyyy-MM-dd');
    const to = format(endOfMonth(viewMonth), 'yyyy-MM-dd');

    authFetch(`/api/bookings-teacher?teacherId=${teacherId}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(data => setBookings(data.bookings || []))
      .catch(() => {
        // Fallback to regular bookings endpoint
        authFetch(`/api/bookings?teacherId=${teacherId}&from=${from}&to=${to}`)
          .then(r => r.json())
          .then(data => setBookings(data.bookings || []))
          .catch(() => setBookings([]));
      })
      .finally(() => setLoading(false));
  }, [teacherId, viewMonth]);

  /* ---- Load availability ---- */
  useEffect(() => {
    if (!teacherId) return;
    authFetch(`/api/teachers/${teacherId}/available-slots`)
      .then(r => r.json())
      .then(data => setAvailability(data.slots || []))
      .catch(() => setAvailability([]));
  }, [teacherId]);

  /* ---- Group bookings ---- */
  const upcomingList = bookings.filter(
    b => (isFuture(parseISO(b.date)) || isToday(parseISO(b.date))) && b.status === 'confirmed'
  ).sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));

  const repositionList = bookings.filter(
    b => (b.booking_type === 'reposition' || b.booking_type === 'makeup') && b.status === 'confirmed'
  );

  const recurringList = bookings.filter(
    b => b.booking_type === 'recurring' && b.status === 'confirmed'
  );

  /* ---- Availability summary ---- */
  const availByDay = availability.reduce<Record<number, AvailabilitySlot[]>>((acc, s) => {
    if (!acc[s.dayOfWeek]) acc[s.dayOfWeek] = [];
    acc[s.dayOfWeek].push(s);
    return acc;
  }, {});

  /* ---- Stats ---- */
  const totalUpcoming = upcomingList.length;
  const totalRepositions = repositionList.length;
  const totalRecurring = recurringList.length;

  /* ---- Detail view ---- */
  const openDetail = (booking: Booking) => {
    setDetailBooking(booking);
    setDetailOpen(true);
  };

  /* ---- Loading ---- */
  if (loading || !teacherId) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4"><div className="h-12 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minha Agenda</h1>
          <p className="text-sm text-muted-foreground">Visualização da sua agenda semanal</p>
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
          <Button variant="ghost" size="icon" className="size-8"
            onClick={() => setViewMonth(prev => subMonths(prev, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium px-2 min-w-[120px] text-center">
            {format(viewMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" className="size-8"
            onClick={() => setViewMonth(prev => addMonths(prev, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-emerald-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalUpcoming}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Próximas Aulas</p>
          </CardContent>
        </Card>
        <Card className="border-amber-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{totalRepositions}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Reposições</p>
          </CardContent>
        </Card>
        <Card className="border-blue-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalRecurring}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Recorrentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Availability summary */}
      {Object.keys(availByDay).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="size-4 text-emerald-600" />
              Resumo de Disponibilidade
            </CardTitle>
            <CardDescription>Seus horários disponíveis por dia da semana</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(day => (
                <div key={day} className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-semibold mb-1">{dayNames[day]}</p>
                  {availByDay[day] ? (
                    <div className="flex flex-wrap gap-1">
                      {availByDay[day]
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map(s => (
                          <Badge key={s.id} variant="outline" className="text-xs">
                            {s.startTime}-{s.endTime}
                          </Badge>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Indisponível</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming classes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="size-4 text-emerald-600" />
            Próximas Aulas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma aula agendada neste mês
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {upcomingList.map(b => {
                const todayMark = isToday(parseISO(b.date));
                return (
                  <button
                    key={b.id}
                    onClick={() => openDetail(b)}
                    className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/30 ${
                      todayMark ? 'border-emerald-300 bg-emerald-50/50' : 'border-border'
                    }`}
                  >
                    <div className="mt-0.5 p-2 rounded-lg bg-emerald-100 text-emerald-700">
                      <Clock className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">
                          {format(parseISO(b.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </span>
                        {todayMark && (
                          <Badge className="text-xs bg-emerald-600 text-white">Hoje</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {typeLabel[b.booking_type] || 'Aula'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-1.5 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {b.start_time} – {b.end_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="size-3.5" />
                          {b.studentName || '—'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repositions */}
      {repositionList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="size-4 text-amber-600" />
              Reposições
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {repositionList.map(b => (
                <button
                  key={b.id}
                  onClick={() => openDetail(b)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/30 hover:bg-amber-50/50 transition-colors"
                >
                  <RotateCcw className="size-4 text-amber-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm">
                      {format(parseISO(b.date), "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {b.start_time} – {b.end_time} • {b.studentName}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recurring bookings */}
      {recurringList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="size-4 text-blue-600" />
              Agendamentos Recorrentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recurringList.map(b => (
                <button
                  key={b.id}
                  onClick={() => openDetail(b)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
                >
                  <CalendarClock className="size-4 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm">
                      {format(parseISO(b.date), "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {b.start_time} – {b.end_time} • {b.studentName}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    Recorrente
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog (read-only) */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="size-5 text-emerald-600" />
              Detalhes da Aula
            </DialogTitle>
          </DialogHeader>
          {detailBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="text-sm font-medium">
                    {format(parseISO(detailBooking.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Horário</p>
                  <p className="text-sm font-medium">{detailBooking.start_time} – {detailBooking.end_time}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Aluno</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <User className="size-3.5" />
                    {detailBooking.studentName || '—'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <Badge variant="outline" className="text-xs">
                    {typeLabel[detailBooking.booking_type] || 'Aula'}
                  </Badge>
                </div>
              </div>
              {detailBooking.notes && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <StickyNote className="size-3" />
                    Observações
                  </p>
                  <p className="text-sm mt-1">{detailBooking.notes}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge className={statusConfig[detailBooking.status]?.color || 'bg-gray-100 text-gray-700'}>
                  {statusConfig[detailBooking.status]?.label || detailBooking.status}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
