'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardList, MoreHorizontal, CheckCircle, XCircle, Clock, Filter, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Booking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  studentName: string;
  studentEmail?: string;
  notes?: string;
  status: string;
  teacher: { name: string };
  studentProfile?: { name: string } | null;
  studentProfileId?: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  confirmed: { label: 'Confirmado', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
  completed: { label: 'Concluído', color: 'bg-gray-100 text-gray-700', icon: Clock },
};

export function AgendamentosPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/bookings')
      .then((res) => res.json())
      .then((data) => {
        setBookings(data.bookings || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Erro ao carregar agendamentos');
        setLoading(false);
      });
  }, []);

  const filtered = bookings.filter(
    (b) => statusFilter === 'all' || b.status === statusFilter
  );

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Agendamento ${statusConfig[status]?.label || status}`);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b))
      );
    } catch {
      toast.error('Erro ao atualizar agendamento');
    }
  };

  const deleteBooking = async (id: string) => {
    if (!confirm('Deseja realmente excluir este agendamento?')) return;
    try {
      await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      toast.success('Agendamento excluído');
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch {
      toast.error('Erro ao excluir agendamento');
    }
  };

  const sortedBookings = [...filtered].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agendamentos</h1>
          <p className="text-muted-foreground">Gerencie todos os agendamentos</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="confirmed">Confirmados</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-60 bg-muted rounded" />
          </CardContent>
        </Card>
      ) : sortedBookings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <ClipboardList className="size-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum agendamento encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Matéria/Livro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBookings.map((booking) => {
                  const config = statusConfig[booking.status] || statusConfig.confirmed;
                  const StatusIcon = config.icon;
                  return (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium text-sm">
                        {format(parseISO(booking.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="size-3 text-muted-foreground" />
                          <span className="text-sm font-mono">
                            {booking.startTime}-{booking.endTime}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{booking.teacher?.name || '-'}</TableCell>
                      <TableCell>{booking.studentName}</TableCell>
                      <TableCell>
                        {booking.notes ? (
                          <span className="text-xs flex items-center gap-1">
                            <BookOpen className="size-3 text-muted-foreground" />
                            {booking.notes}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color}>
                          <StatusIcon className="size-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {booking.status === 'confirmed' && (
                              <>
                                <DropdownMenuItem onClick={() => updateStatus(booking.id, 'completed')}>
                                  <CheckCircle className="size-4 mr-2" />
                                  Marcar Concluído
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(booking.id, 'cancelled')}>
                                  <XCircle className="size-4 mr-2" />
                                  Cancelar
                                </DropdownMenuItem>
                              </>
                            )}
                            {booking.status === 'cancelled' && (
                              <DropdownMenuItem onClick={() => updateStatus(booking.id, 'confirmed')}>
                                <CheckCircle className="size-4 mr-2" />
                                Reconfirmar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteBooking(booking.id)}
                            >
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <CheckCircle className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Confirmados</p>
              <p className="text-xl font-bold">{bookings.filter((b) => b.status === 'confirmed').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-50">
              <Clock className="size-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Concluídos</p>
              <p className="text-xl font-bold">{bookings.filter((b) => b.status === 'completed').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50">
              <XCircle className="size-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cancelados</p>
              <p className="text-xl font-bold">{bookings.filter((b) => b.status === 'cancelled').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
