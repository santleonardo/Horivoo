'use client';

import { authFetch } from '@/lib/store';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { ClipboardList, MoreHorizontal, CheckCircle, XCircle, Clock, Filter, RotateCcw, Plus, Loader2, StickyNote } from 'lucide-react';
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
  status: string;
  bookingType?: string;
  originalBookingId?: string;
  notes?: string;
  teacher: { id?: string; name: string };
  studentProfile?: { name: string } | null;
  studentProfileId?: string | null;
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

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  confirmed: { label: 'Confirmado', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
  completed: { label: 'Concluído', color: 'bg-gray-100 text-gray-700', icon: Clock },
  reposition: { label: 'Reposição', color: 'bg-purple-100 text-purple-700', icon: RotateCcw },
};

export function AgendamentosPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Reposition dialog state
  const [reposOpen, setReposOpen] = useState(false);
  const [reposOriginalBooking, setReposOriginalBooking] = useState<Booking | null>(null);
  const [reposTeacher, setReposTeacher] = useState('');
  const [reposDate, setReposDate] = useState('');
  const [reposStartTime, setReposStartTime] = useState('');
  const [reposEndTime, setReposEndTime] = useState('');
  const [reposStudent, setReposStudent] = useState('');
  const [reposNotes, setReposNotes] = useState('');
  const [reposSubmitting, setReposSubmitting] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [reposAvailableSlots, setReposAvailableSlots] = useState<{ startTime: string; endTime: string; available: boolean; reason?: string }[]>([]);

  const loadBookings = useCallback(async () => {
    try {
      const res = await authFetch('/api/bookings');
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch {
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Load teachers and students for reposição dialog
  useEffect(() => {
    if (reposOpen) {
      Promise.all([
        authFetch('/api/teachers').then((r) => r.json()),
        authFetch('/api/students').then((r) => r.json()),
      ])
        .then(([tData, sData]) => {
          setTeachers(tData.teachers || []);
          setStudents(sData.students || []);
        })
        .catch(() => {
          toast.error('Erro ao carregar dados');
        });
    }
  }, [reposOpen]);

  // Compute available slots for reposição
  useEffect(() => {
    if (!reposTeacher || !reposDate) {
      setReposAvailableSlots([]);
      return;
    }

    const teacher = teachers.find((t) => t.id === reposTeacher);
    if (!teacher) {
      setReposAvailableSlots([]);
      return;
    }

    const dateObj = new Date(reposDate + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();

    const daySlots = teacher.availableSlots
      .filter((s) => s.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (daySlots.length === 0) {
      setReposAvailableSlots([]);
      return;
    }

    const computeAvailability = async () => {
      try {
        const [bookingsRes, blockedRes, holidaysRes, recessesRes] = await Promise.all([
          authFetch(`/api/bookings?teacherId=${reposTeacher}&date=${reposDate}`),
          authFetch(`/api/blocked-slots?teacherId=${reposTeacher}&date=${reposDate}`),
          authFetch(`/api/holidays?year=${reposDate.substring(0, 4)}&month=${reposDate.substring(5, 7)}`),
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

        const isHoliday = (holidaysData.holidays || []).some((h: { date: string }) => h.date === reposDate);
        const isRecess = (recessesData.recesses || []).some(
          (r: { startDate: string; endDate: string }) => reposDate >= r.startDate && reposDate <= r.endDate
        );

        const slots = daySlots.map((slot) => {
          const key = `${slot.startTime}-${slot.endTime}`;
          let available = true;
          let reason: string | undefined;

          if (isHoliday) {
            available = false;
            reason = 'Feriado';
          } else if (isRecess) {
            available = false;
            reason = 'Recesso';
          } else if (blockedSlotKeys.has(key)) {
            available = false;
            reason = 'Bloqueado';
          } else if (bookedSlots.has(key)) {
            available = false;
            reason = 'Já agendado';
          }

          return { startTime: slot.startTime, endTime: slot.endTime, available, reason };
        });

        setReposAvailableSlots(slots);
      } catch {
        setReposAvailableSlots(daySlots.map((s) => ({ startTime: s.startTime, endTime: s.endTime, available: true })));
      }
    };

    computeAvailability();
  }, [reposTeacher, reposDate, teachers]);

  const filtered = bookings.filter((b) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'reposition') return b.bookingType === 'reposition';
    return b.status === statusFilter;
  });

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await authFetch(`/api/bookings/${id}`, {
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
      await authFetch(`/api/bookings/${id}`, { method: 'DELETE' });
      toast.success('Agendamento excluído');
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch {
      toast.error('Erro ao excluir agendamento');
    }
  };

  const openReposDialog = (booking: Booking) => {
    setReposOriginalBooking(booking);
    setReposTeacher(booking.teacher?.id || '');
    setReposDate('');
    setReposStartTime('');
    setReposEndTime('');
    setReposStudent('');
    setReposNotes('');
    setReposOpen(true);
  };

  const handleCreateReposition = async () => {
    if (!reposTeacher || !reposDate || !reposStartTime || !reposEndTime || !reposStudent) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const student = students.find((s) => s.id === reposStudent);
    if (!student) {
      toast.error('Selecione um aluno válido');
      return;
    }

    setReposSubmitting(true);
    try {
      const res = await authFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: reposTeacher,
          studentName: student.name,
          studentEmail: student.email,
          studentProfileId: student.id,
          date: reposDate,
          startTime: reposStartTime,
          endTime: reposEndTime,
          notes: reposNotes,
          bookingType: 'reposition',
          originalBookingId: reposOriginalBooking?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar reposição');
      }

      toast.success('Reposição agendada com sucesso!');
      setReposOpen(false);
      loadBookings();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar reposição');
    } finally {
      setReposSubmitting(false);
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="confirmed">Confirmados</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
              <SelectItem value="reposition">Reposições</SelectItem>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Professor</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBookings.map((booking) => {
                    const config = statusConfig[booking.status] || statusConfig.confirmed;
                    const StatusIcon = config.icon;
                    const isReposition = booking.bookingType === 'reposition';
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
                          {isReposition ? (
                            <Badge className="bg-purple-100 text-purple-700">
                              <RotateCcw className="size-3 mr-1" />
                              Reposição
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">Normal</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={config.color}>
                            <StatusIcon className="size-3 mr-1" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {booking.notes ? (
                            <div className="flex items-start gap-1 text-xs text-muted-foreground">
                              <StickyNote className="size-3 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{booking.notes}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
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
                                <>
                                  <DropdownMenuItem onClick={() => updateStatus(booking.id, 'confirmed')}>
                                    <CheckCircle className="size-4 mr-2" />
                                    Reconfirmar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openReposDialog(booking)}>
                                    <RotateCcw className="size-4 mr-2" />
                                    Agendar Reposição
                                  </DropdownMenuItem>
                                </>
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <CheckCircle className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Confirmados</p>
              <p className="text-xl font-bold">{bookings.filter((b) => b.status === 'confirmed' && b.bookingType !== 'reposition').length}</p>
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
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <RotateCcw className="size-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reposições</p>
              <p className="text-xl font-bold">{bookings.filter((b) => b.bookingType === 'reposition').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reposition Dialog */}
      <Dialog open={reposOpen} onOpenChange={setReposOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="size-5 text-purple-600" />
              Agendar Reposição
            </DialogTitle>
            <DialogDescription>
              Crie uma reposição para a aula cancelada
            </DialogDescription>
          </DialogHeader>

          {reposOriginalBooking && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm">
              <p className="font-medium text-red-800">Aula Original Cancelada:</p>
              <p className="text-red-700">
                {format(parseISO(reposOriginalBooking.date), 'dd/MM/yyyy')} •{' '}
                {reposOriginalBooking.startTime}-{reposOriginalBooking.endTime} •{' '}
                {reposOriginalBooking.studentName} • {reposOriginalBooking.teacher?.name}
              </p>
              {reposOriginalBooking.notes && (
                <p className="text-xs text-red-600 mt-1">Obs: {reposOriginalBooking.notes}</p>
              )}
            </div>
          )}

          <div className="space-y-4">
            {/* Teacher */}
            <div className="space-y-2">
              <Label>Professor *</Label>
              <Select value={reposTeacher} onValueChange={(v) => {
                setReposTeacher(v);
                setReposStartTime('');
                setReposEndTime('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o professor" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {t.subjects ? ` — ${t.subjects.split(',').slice(0, 2).join(', ')}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Data da Reposição *</Label>
              <Input
                type="date"
                value={reposDate}
                onChange={(e) => {
                  setReposDate(e.target.value);
                  setReposStartTime('');
                  setReposEndTime('');
                }}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            {/* Available Slots */}
            {reposTeacher && reposDate && reposAvailableSlots.length > 0 && (
              <div className="space-y-2">
                <Label className="text-emerald-600">Horários Disponíveis</Label>
                <div className="flex flex-wrap gap-1">
                  {reposAvailableSlots.map((slot) => (
                    <button
                      key={`${slot.startTime}-${slot.endTime}`}
                      className={`px-2 py-1 rounded text-xs border transition-all ${
                        !slot.available
                          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed line-through'
                          : reposStartTime === slot.startTime && reposEndTime === slot.endTime
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                      }`}
                      disabled={!slot.available}
                      onClick={() => {
                        if (slot.available) {
                          setReposStartTime(slot.startTime);
                          setReposEndTime(slot.endTime);
                        }
                      }}
                    >
                      {slot.startTime}-{slot.endTime}
                      {!slot.available && slot.reason && ` (${slot.reason})`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {reposTeacher && reposDate && reposAvailableSlots.length === 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                Nenhum horário disponível para este professor nesta data.
              </div>
            )}

            {/* Student */}
            <div className="space-y-2">
              <Label>Aluno *</Label>
              <Select value={reposStudent} onValueChange={setReposStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o aluno" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <StickyNote className="size-4" />
                Observações
              </Label>
              <Textarea
                placeholder="Ex: Matéria, livro, capítulo, tema da aula..."
                value={reposNotes}
                onChange={(e) => setReposNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReposOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateReposition}
              disabled={reposSubmitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {reposSubmitting ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="size-4 mr-2" />
              )}
              Agendar Reposição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
