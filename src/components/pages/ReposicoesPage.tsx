'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RotateCcw,
  Plus,
  Loader2,
  StickyNote,
  XCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  CalendarDays,
  ArrowRight,
} from 'lucide-react';
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
  teacher?: { name: string };
  teacherId?: string;
  dayOfWeek?: number;
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

export function ReposicoesPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

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
  const [reposAvailableSlots, setReposAvailableSlots] = useState<{ startTime: string; endTime: string; available: boolean; reason?: string }[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [bRes, tRes, sRes] = await Promise.all([
        fetch('/api/appointments').then((r) => r.json()),
        fetch('/api/teachers').then((r) => r.json()),
        fetch('/api/students').then((r) => r.json()),
      ]);
      setBookings(bRes.appointments || []);
      setTeachers(tRes.teachers || []);
      setStudents(sRes.students || []);
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute available slots for reposição dialog
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
          fetch(`/api/appointments?teacherId=${reposTeacher}&date=${reposDate}`),
          fetch(`/api/appointments?teacherId=${reposTeacher}&date=${reposDate}`),
          fetch(`/api/holidays?year=${reposDate.substring(0, 4)}&month=${reposDate.substring(5, 7)}`),
          fetch('/api/recesses'),
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

  // Separate cancelled bookings without reposição and reposition bookings
  const repositionBookings = bookings.filter((b) => b.bookingType === 'reposition');
  const repositionOriginalIds = new Set(repositionBookings.map((b) => b.originalBookingId).filter(Boolean));

  const cancelledWithoutReposition = bookings.filter(
    (b) => b.status === 'cancelled' && !repositionOriginalIds.has(b.id) && b.bookingType !== 'reposition'
  );

  const openReposDialog = (booking: Booking) => {
    setReposOriginalBooking(booking);
    setReposTeacher(booking.teacherId || '');
    setReposDate('');
    setReposStartTime('');
    setReposEndTime('');
    setReposStudent('');
    setReposNotes(booking.notes || '');
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
      const res = await fetch('/api/appointments', {
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
      setLoading(true);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar reposição');
    } finally {
      setReposSubmitting(false);
    }
  };

  // Get the original booking for a reposition
  const getOriginalBooking = (originalId?: string): Booking | undefined => {
    if (!originalId) return undefined;
    return bookings.find((b) => b.id === originalId);
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'cancelled': return 'Cancelado';
      case 'completed': return 'Concluído';
      default: return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-60 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reposições</h1>
        <p className="text-muted-foreground">Gerencie reposições de aulas canceladas</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50">
              <XCircle className="size-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aguardando Reposição</p>
              <p className="text-xl font-bold">{cancelledWithoutReposition.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <RotateCcw className="size-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reposições Agendadas</p>
              <p className="text-xl font-bold">{repositionBookings.filter((b) => b.status === 'confirmed').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <CheckCircle className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reposições Concluídas</p>
              <p className="text-xl font-bold">{repositionBookings.filter((b) => b.status === 'completed').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cancelled Bookings Without Reposition */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <XCircle className="size-5 text-red-500" />
            Aulas Canceladas sem Reposição
          </CardTitle>
          <CardDescription>
            Aulas canceladas que ainda não têm uma reposição agendada
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cancelledWithoutReposition.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="size-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma aula cancelada sem reposição</p>
              <p className="text-xs mt-1">Todas as aulas canceladas já possuem reposição agendada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Original</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Professor</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="w-[140px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cancelledWithoutReposition.map((booking) => (
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
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 h-8 text-xs"
                          onClick={() => openReposDialog(booking)}
                        >
                          <RotateCcw className="size-3 mr-1" />
                          Agendar Reposição
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reposition Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="size-5 text-purple-500" />
            Reposições Agendadas
          </CardTitle>
          <CardDescription>
            Todas as reposições de aulas criadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {repositionBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="size-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma reposição agendada</p>
              <p className="text-xs mt-1">Agende uma reposição a partir de uma aula cancelada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Original</TableHead>
                    <TableHead>Data Reposição</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Professor</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repositionBookings.map((booking) => {
                    const original = getOriginalBooking(booking.originalBookingId);
                    return (
                      <TableRow key={booking.id}>
                        <TableCell className="text-sm">
                          {original ? (
                            <div>
                              <span className="font-medium">
                                {format(parseISO(original.date), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                              <span className="text-xs text-muted-foreground block">
                                {original.startTime}-{original.endTime}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="size-3 text-emerald-500" />
                            <div>
                              <span>
                                {format(parseISO(booking.date), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                              <span className="text-xs text-muted-foreground block">
                                {booking.startTime}-{booking.endTime}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <ArrowRight className="size-3 text-purple-400" />
                            {booking.startTime}-{booking.endTime}
                          </div>
                        </TableCell>
                        <TableCell>{booking.teacher?.name || '-'}</TableCell>
                        <TableCell>{booking.studentName}</TableCell>
                        <TableCell>
                          <Badge className={statusColor(booking.status)}>
                            {statusLabel(booking.status)}
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
