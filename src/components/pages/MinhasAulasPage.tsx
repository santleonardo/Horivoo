'use client';

/**
 * MinhasAulasPage.tsx
 * Página do aluno: visualiza suas próprias aulas — passadas, hoje e futuras.
 * O aluno NÃO pode editar, criar ou cancelar aulas.
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

/* ------------------------------------------------------------------ */

export function MinhasAulasPage() {
  const { user } = useAuthStore();
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [viewMonth, setViewMonth] = useState(new Date());

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const from = format(startOfMonth(viewMonth), 'yyyy-MM-dd');
    const to   = format(endOfMonth(viewMonth),   'yyyy-MM-dd');

    authFetch(`/api/bookings?studentEmail=${encodeURIComponent(user.email)}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(data => setBookings(data.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
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
  const repoCount  = bookings.filter(b => b.booking_type === 'reposition' || b.booking_type === 'makeup').length;

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
          <p className="text-sm text-muted-foreground">Seu histórico e próximas aulas</p>
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

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
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
            <Section
              title="Hoje"
              list={todayList}
              icon={CalendarDays}
              emptyMsg="Nenhuma aula hoje neste mês."
            />
            <Section
              title="Próximas Aulas"
              list={upcomingList}
              icon={Clock}
              emptyMsg="Nenhuma aula futura neste mês."
            />
            <Section
              title="Aulas Passadas"
              list={pastList.slice(0, 20)}
              icon={BookOpen}
              emptyMsg="Nenhuma aula passada neste mês."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
