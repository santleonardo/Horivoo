'use client';

/**
 * MinhasAulasPage.tsx
 * Página do aluno: visualiza suas próprias aulas — SOMENTE LEITURA.
 * Sem botões de agendamento. Mostra: aulas, provas, resumo de faltas, reposições.
 */

import { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  CalendarDays,
  Clock,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  ClipboardCheck,
} from 'lucide-react';
import {
  format,
  parseISO,
  isToday,
  isFuture,
  isPast,
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
  teacher: { name: string };
  className?: string;
}

interface Test {
  id: string;
  title: string;
  date: string;
  class?: { name: string; subject: string };
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'justified';
  className: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  confirmed:   { label: 'Confirmada',  color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled:   { label: 'Cancelada',   color: 'bg-red-100 text-red-700',         icon: XCircle },
  completed:   { label: 'Concluída',   color: 'bg-gray-100 text-gray-700',       icon: CheckCircle },
  reposition:  { label: 'Reposição',   color: 'bg-amber-100 text-amber-700',     icon: RotateCcw },
};

const typeLabel: Record<string, string> = {
  normal:     '',
  recurring:  'Recorrente',
  reposition: 'Reposição',
  makeup:     'Reposição',
};

const attendanceStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  present:   { label: 'Presente',    color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  absent:    { label: 'Ausente',     color: 'bg-red-100 text-red-700',         icon: XCircle },
  justified: { label: 'Justificado', color: 'bg-amber-100 text-amber-700',     icon: AlertCircle },
};

/* ------------------------------------------------------------------ */

export function MinhasAulasPage() {
  const { user } = useAuthStore();
  const [bookings, setBookings]         = useState<Booking[]>([]);
  const [tests, setTests]               = useState<Test[]>([]);
  const [attendance, setAttendance]     = useState<AttendanceRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [viewMonth, setViewMonth]       = useState(new Date());
  const [activeTab, setActiveTab]       = useState<'aulas' | 'provas' | 'faltas'>('aulas');

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const from = format(startOfMonth(viewMonth), 'yyyy-MM-dd');
    const to   = format(endOfMonth(viewMonth),   'yyyy-MM-dd');

    Promise.all([
      authFetch(`/api/bookings?studentEmail=${encodeURIComponent(user.email)}&from=${from}&to=${to}`)
        .then(r => r.json())
        .then(data => data.bookings || [])
        .catch(() => []),
      authFetch('/api/tests')
        .then(r => r.json())
        .then(data => data.tests || [])
        .catch(() => []),
      authFetch(`/api/attendance?studentId=${user.id}`)
        .then(r => r.json())
        .then(data => data.attendance || [])
        .catch(() => []),
    ]).then(([b, t, a]) => {
      setBookings(b);
      setTests(t);
      setAttendance(a);
      setLoading(false);
    });
  }, [user, viewMonth]);

  /* ---- filter by search ---- */
  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      b.teacher?.name?.toLowerCase().includes(q) ||
      b.date?.includes(q) ||
      b.status?.toLowerCase().includes(q)
    );
  });

  /* ---- group by "today / upcoming / past" ---- */
  const todayList    = filtered.filter(b => isToday(parseISO(b.date)));
  const upcomingList = filtered.filter(b => isFuture(parseISO(b.date)) && !isToday(parseISO(b.date)));
  const pastList     = filtered.filter(b => isPast(parseISO(b.date))  && !isToday(parseISO(b.date)));

  /* ---- stats ---- */
  const confirmed  = bookings.filter(b => b.status === 'confirmed').length;
  const completed  = bookings.filter(b => b.status === 'completed').length;
  const repoCount  = bookings.filter(b => b.booking_type === 'reposition' || b.booking_type === 'reposition').length;

  /* ---- Attendance stats ---- */
  const totalAbsences = attendance.filter(a => a.status === 'absent').length;
  const totalPresent = attendance.filter(a => a.status === 'present').length;
  const totalJustified = attendance.filter(a => a.status === 'justified').length;

  /* ---- Filter tests for student's classes ---- */
  const studentTests = tests; // API will filter based on student's classes

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const cfg    = statusConfig[booking.status] || statusConfig.confirmed;
    const Icon   = cfg.icon;
    const todayMark = isToday(parseISO(booking.date));

    return (
      <div className={`flex items-start gap-3 p-4 rounded-lg border transition-colors hover:bg-muted/30 ${
        todayMark ? 'border-emerald-300 bg-emerald-50/50' : 'border-border'
      }`}>
        <div className={`mt-0.5 p-2 rounded-lg ${cfg.color} bg-opacity-20`}>
          <Icon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm">
              {format(parseISO(booking.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </span>
            {todayMark && (
              <Badge className="text-xs bg-emerald-600 text-white">Hoje</Badge>
            )}
            <Badge variant="outline" className={`text-xs ${cfg.color}`}>
              {cfg.label}
            </Badge>
            {typeLabel[booking.booking_type] && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                {typeLabel[booking.booking_type]}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-4 mt-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {booking.start_time} – {booking.end_time}
            </span>
            <span className="flex items-center gap-1">
              <User className="size-3.5" />
              Prof. {booking.teacher?.name || '—'}
            </span>
            {booking.className && (
              <span className="flex items-center gap-1">
                <BookOpen className="size-3.5" />
                {booking.className}
              </span>
            )}
          </div>
          {booking.notes && (
            <p className="text-xs text-muted-foreground mt-1 italic">{booking.notes}</p>
          )}
        </div>
      </div>
    );
  };

  const Section = ({
    title,
    list,
    icon: Icon,
    emptyMsg,
  }: {
    title: string;
    list: Booking[];
    icon: React.ElementType;
    emptyMsg: string;
  }) => (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        <Icon className="size-4" />
        {title}
        <Badge variant="secondary" className="ml-1 text-xs">{list.length}</Badge>
      </h3>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3 pl-6">{emptyMsg}</p>
      ) : (
        <div className="space-y-2">
          {list.map(b => <BookingCard key={b.id} booking={b} />)}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Aulas</h1>
          <p className="text-sm text-muted-foreground">Seu histórico, provas e frequência</p>
        </div>
        {/* Month navigation */}
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

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {[
          { key: 'aulas' as const, label: 'Aulas', icon: BookOpen },
          { key: 'provas' as const, label: 'Provas', icon: FileText },
          { key: 'faltas' as const, label: 'Faltas', icon: ClipboardCheck },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white shadow-sm text-emerald-700'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Aulas Tab ── */}
      {activeTab === 'aulas' && (
        <>
          {/* Stats strip */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="border-emerald-100">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{confirmed}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Confirmadas</p>
              </CardContent>
            </Card>
            <Card className="border-gray-100">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-600">{completed}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Concluídas</p>
              </CardContent>
            </Card>
            <Card className="border-amber-100">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{repoCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Reposições</p>
              </CardContent>
            </Card>
            <Card className="border-red-100">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{totalAbsences}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Faltas</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por professor, data ou status..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <Loader2 className="size-6 animate-spin mr-2" />
              Carregando aulas...
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 space-y-8">
                <Section title="Hoje" list={todayList} icon={CalendarDays} emptyMsg="Nenhuma aula hoje neste mês." />
                <Section title="Próximas Aulas" list={upcomingList} icon={Clock} emptyMsg="Nenhuma aula futura neste mês." />
                <Section title="Aulas Passadas" list={pastList.slice(0, 20)} icon={BookOpen} emptyMsg="Nenhuma aula passada neste mês." />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ── Provas Tab ── */}
      {activeTab === 'provas' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="size-4 text-purple-600" />
              Provas Agendadas
            </CardTitle>
            <CardDescription>Provas das suas turmas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-20 text-muted-foreground">
                <Loader2 className="size-5 animate-spin mr-2" />
                Carregando...
              </div>
            ) : studentTests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma prova agendada
              </p>
            ) : (
              <div className="space-y-2">
                {studentTests.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-purple-50/30 border border-purple-100">
                    <FileText className="size-4 text-purple-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.class?.name || '—'} — {t.class?.subject || ''}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {format(parseISO(t.date), "dd 'de' MMM", { locale: ptBR })}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Faltas Tab ── */}
      {activeTab === 'faltas' && (
        <>
          {/* Attendance stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-emerald-100">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{totalPresent}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Presentes</p>
              </CardContent>
            </Card>
            <Card className="border-red-100">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{totalAbsences}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Faltas</p>
              </CardContent>
            </Card>
            <Card className="border-amber-100">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{totalJustified}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Justificadas</p>
              </CardContent>
            </Card>
          </div>

          {/* Attendance rate */}
          {attendance.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Frequência</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {Math.round((totalPresent / attendance.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-emerald-500 rounded-full h-3 transition-all"
                    style={{ width: `${(totalPresent / attendance.length) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="size-4 text-emerald-600" />
                Histórico de Presença
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-20 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mr-2" />
                  Carregando...
                </div>
              ) : attendance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum registro de presença encontrado
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {attendance.map(r => {
                    const cfg = attendanceStatusConfig[r.status] || attendanceStatusConfig.present;
                    const Icon = cfg.icon;
                    return (
                      <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                        <Icon className={`size-4 shrink-0 ${cfg.color.split(' ')[1]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {format(parseISO(r.date), "dd 'de' MMM", { locale: ptBR })}
                            </span>
                            <Badge variant="outline" className="text-xs">{r.className}</Badge>
                          </div>
                        </div>
                        <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
