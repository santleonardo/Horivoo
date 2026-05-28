'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/store';
import { WeekGrid, type SlotInfo, type DaySchedule } from './WeekGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format, startOfWeek } from 'date-fns';
import { toast } from 'sonner';
import { BookOpen } from 'lucide-react';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];



export function CoordinatorPanel() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [teacherId, setTeacherId] = useState<string>('__all__');
  const [teachers, setTeachers] = useState<{ id: string; name: string; availableSlots?: any[] }[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [nonClassDays, setNonClassDays] = useState<any[]>([]);
  const [recurringBookings, setRecurringBookings] = useState<any[]>([]);

  // Edit modal state
  const [editModal, setEditModal] = useState(false);
  const [editTeacherId, setEditTeacherId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDayOfWeek, setEditDayOfWeek] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editMode, setEditMode] = useState<'book' | 'block' | 'cancel'>('book');
  const [editBookingId, setEditBookingId] = useState('');

  // Available slots for selected teacher in edit modal
  const [teacherAvailSlots, setTeacherAvailSlots] = useState<any[]>([]);

  // Non-class day modal
  const [ncdModal, setNcdModal] = useState(false);
  const [ncdDate, setNcdDate] = useState('');
  const [ncdReason, setNcdReason] = useState('');

  // Recurring modal
  const [recurModal, setRecurModal] = useState(false);
  const [recurData, setRecurData] = useState({ teacherId: '', studentName: '', studentEmail: '', dayOfWeek: '1', startTime: '14:00', endTime: '15:00' });

  // Search filter
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    authFetch('/api/teachers').then(r => r.json()).then(data => { if (!cancelled) setTeachers(data.teachers || []); });
    loadNonClassDays();
    loadRecurringBookings();
    return () => { cancelled = true; };
  }, []);

  const loadNonClassDays = useCallback(async () => {
    try {
      const res = await authFetch('/api/non-class-days');
      const data = await res.json();
      setNonClassDays(data.nonClassDays || []);
    } catch { /* ignore */ }
  }, []);

  const loadRecurringBookings = useCallback(async () => {
    try {
      const res = await authFetch('/api/recurring-bookings');
      const data = await res.json();
      setRecurringBookings(data.recurringBookings || []);
    } catch { /* ignore */ }
  }, []);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const tid = teacherId === '__all__' ? teachers[0]?.id : teacherId;
      if (!tid) { setLoading(false); return; }
      const res = await authFetch(`/api/teachers/${tid}/schedule?weekStart=${weekStart}`);
      const data = await res.json();
      setSchedule(data.schedule || []);
    } catch { toast.error('Erro ao carregar agenda'); }
    setLoading(false);
  }, [teacherId, weekStart, teachers]);

  const loadBookings = useCallback(async () => {
    const res = await authFetch(`/api/bookings?weekStart=${weekStart}`);
    const data = await res.json();
    setBookings(data.bookings || []);
  }, [weekStart]);

  useEffect(() => {
    let cancelled = false;
    const tid = teacherId === '__all__' ? teachers[0]?.id : teacherId;
    if (tid) {
      queueMicrotask(() => { if (!cancelled) setLoading(true); });
      authFetch(`/api/teachers/${tid}/schedule?weekStart=${weekStart}`)
        .then(r => r.json())
        .then(data => { if (!cancelled) { setSchedule(data.schedule || []); setLoading(false); } })
        .catch(() => { if (!cancelled) { toast.error('Erro ao carregar agenda'); setLoading(false); } });
    }
    authFetch(`/api/bookings?weekStart=${weekStart}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setBookings(data.bookings || []); });
    return () => { cancelled = true; };
  }, [teacherId, weekStart, teachers]);

  const handleSlotClick = (day: DaySchedule, slot: SlotInfo) => {
    setEditDate(day.date);
    setEditDayOfWeek(String(day.dayOfWeek));
    setEditStartTime(slot.startTime);
    setEditEndTime(slot.endTime);
    setEditTeacherId(teacherId === '__all__' ? '' : teacherId);
    setEditStudentName('');
    setEditStudentEmail('');
    setEditNotes('');

    if (slot.status === 'booked' && slot.booking) {
      setEditMode('cancel');
      setEditBookingId(slot.booking.id);
      setEditStudentName(slot.booking.studentName);
      setEditStudentEmail(slot.booking.studentEmail || '');
    } else if (slot.status === 'blocked') {
      setEditMode('book');
    } else {
      setEditMode('book');
    }
    setEditModal(true);
    loadTeacherAvailSlots(editTeacherId || teacherId === '__all__' ? '' : teacherId);
  };

  const loadTeacherAvailSlots = async (tid: string) => {
    if (!tid) { setTeacherAvailSlots([]); return; }
    const res = await authFetch(`/api/teachers/${tid}/available-slots`);
    const data = await res.json();
    setTeacherAvailSlots(data.slots || []);
  };

  const handleEditTeacherChange = async (tid: string) => {
    setEditTeacherId(tid);
    const res = await authFetch(`/api/teachers/${tid}/available-slots`);
    const data = await res.json();
    const slots = data.slots || [];
    setTeacherAvailSlots(slots);
    // Update dayOfWeek options based on available slots
    const days = [...new Set(slots.map((s: any) => s.dayOfWeek))];
    if (days.length > 0) setEditDayOfWeek(String(days[0]));
  };

  const getAvailableTimesForDay = () => {
    const dow = parseInt(editDayOfWeek);
    return teacherAvailSlots.filter(s => s.dayOfWeek === dow);
  };

  const handleSaveBooking = async () => {
    if (!editTeacherId) { toast.error('Selecione um professor'); return; }
    if (!editDate) { toast.error('Informe a data'); return; }
    if (!editStudentName && editMode === 'book') { toast.error('Informe o nome do aluno'); return; }
    try {
      if (editMode === 'cancel' && editBookingId) {
        await authFetch(`/api/bookings/${editBookingId}`, { method: 'DELETE' });
        toast.success('Agendamento cancelado');
      } else {
        await authFetch('/api/bookings', {
          method: 'POST',
          body: JSON.stringify({
            teacherId: editTeacherId,
            studentName: editStudentName,
            studentEmail: editStudentEmail || undefined,
            date: editDate,
            startTime: editStartTime,
            endTime: editEndTime,
            notes: editNotes || '',
          }),
        });
        toast.success('Agendamento criado!');
      }
      setEditModal(false);
      loadSchedule();
      loadBookings();
    } catch (err: any) { toast.error(err.message || 'Erro ao salvar'); }
  };

  const handleBlockSlot = async () => {
    if (!editTeacherId || !editDate) return;
    try {
      await authFetch('/api/blocked-slots', {
        method: 'POST',
        body: JSON.stringify({ teacherId: editTeacherId, date: editDate, startTime: editStartTime, endTime: editEndTime, reason: 'coordenador' }),
      });
      toast.success('Horário bloqueado');
      setEditModal(false);
      loadSchedule();
    } catch { toast.error('Erro ao bloquear'); }
  };

  const addNonClassDay = async () => {
    if (!ncdDate || !ncdReason) { toast.error('Preencha data e motivo'); return; }
    try {
      await authFetch('/api/non-class-days', {
        method: 'POST',
        body: JSON.stringify({ date: ncdDate, reason: ncdReason }),
      });
      toast.success('Dia sem aula cadastrado');
      setNcdModal(false);
      setNcdDate('');
      setNcdReason('');
      loadNonClassDays();
      loadSchedule();
    } catch (err: any) { toast.error(err.message || 'Erro ao cadastrar'); }
  };

  const removeNonClassDay = async (id: string) => {
    await authFetch(`/api/non-class-days/${id}`, { method: 'DELETE' });
    toast.success('Dia sem aula removido');
    loadNonClassDays();
    loadSchedule();
  };

  const createRecurringBooking = async () => {
    if (!recurData.teacherId || !recurData.studentName) { toast.error('Preencha professor e aluno'); return; }
    try {
      await authFetch('/api/recurring-bookings', {
        method: 'POST',
        body: JSON.stringify({ ...recurData, dayOfWeek: parseInt(recurData.dayOfWeek) }),
      });
      toast.success('Agendamento recorrente criado');
      setRecurModal(false);
      loadRecurringBookings();
      loadSchedule();
    } catch { toast.error('Erro ao criar recorrente'); }
  };

  const deactivateRecurring = async (id: string) => {
    await authFetch(`/api/recurring-bookings/${id}`, { method: 'DELETE' });
    toast.success('Desativado');
    loadRecurringBookings();
    loadSchedule();
  };

  const exportCSV = async () => {
    const res = await authFetch(`/api/export?format=csv&weekStart=${weekStart}`);
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horivoo-agenda-${weekStart}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado!');
  };

  const prevWeek = () => { const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() - 7); setWeekStart(format(d, 'yyyy-MM-dd')); };
  const nextWeek = () => { const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() + 7); setWeekStart(format(d, 'yyyy-MM-dd')); };

  // Stats
  const totalAvailable = schedule.reduce((acc, d) => acc + d.slots.filter(s => s.status === 'available').length, 0);
  const totalBooked = schedule.reduce((acc, d) => acc + d.slots.filter(s => s.status === 'booked').length, 0);
  const totalBlocked = schedule.reduce((acc, d) => acc + d.slots.filter(s => s.status === 'blocked' || s.status === 'non_class_day').length, 0);

  // Filter bookings for table
  const filteredBookings = bookings.filter(b => {
    if (!searchFilter) return true;
    const f = searchFilter.toLowerCase();
    return b.studentName?.toLowerCase().includes(f) || b.date?.includes(f) || b.startTime?.includes(f) ||
      teachers.find(t => t.id === b.teacherId)?.name?.toLowerCase().includes(f);
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-emerald-700">{totalAvailable}</div><div className="text-xs text-emerald-600">Disponíveis</div></CardContent></Card>
        <Card className="bg-red-50 border-red-200"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-700">{totalBlocked}</div><div className="text-xs text-red-600">Bloqueados</div></CardContent></Card>
        <Card className="bg-blue-50 border-blue-200"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-blue-700">{totalBooked}</div><div className="text-xs text-blue-600">Agendados</div></CardContent></Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={teacherId} onValueChange={setTeacherId}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Professor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os professores</SelectItem>
            {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={prevWeek}>←</Button>
          <span className="text-sm font-medium px-2">{new Date(weekStart + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
          <Button variant="outline" size="sm" onClick={nextWeek}>→</Button>
        </div>
        <div className="flex gap-2 ml-auto flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setNcdModal(true)}>Dia sem aula</Button>
          <Button variant="outline" size="sm" onClick={() => setRecurModal(true)}>Recorrente</Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>Exportar CSV</Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 inline-block"></span> Disponível</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 inline-block"></span> Agendado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block"></span> Bloqueado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 inline-block"></span> Sem aula</span>
      </div>

      {/* Week Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <WeekGrid schedule={schedule} mode="coordinator" onSlotClick={handleSlotClick}
          teacherName={teacherId !== '__all__' ? teachers.find(t => t.id === teacherId)?.name : undefined} />
      )}

      {/* Bookings table */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Todos os Agendamentos</h3>
        <Input placeholder="Pesquisar por professor, aluno, data..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} className="mb-2" />
        <ScrollArea className="max-h-64">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Professor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Aluno</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum agendamento encontrado.</TableCell></TableRow>
              ) : filteredBookings.map(b => (
                <TableRow key={b.id}>
                  <TableCell>{teachers.find(t => t.id === b.teacherId)?.name || '—'}</TableCell>
                  <TableCell>{b.date ? new Date(b.date + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</TableCell>
                  <TableCell>{b.startTime}-{b.endTime}</TableCell>
                  <TableCell>{b.studentName}</TableCell>
                  <TableCell><Badge className="bg-blue-100 text-blue-700">Agendado</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={async () => {
                      if (confirm('Cancelar?')) { await authFetch(`/api/bookings/${b.id}`, { method: 'DELETE' }); toast.success('Cancelado'); loadBookings(); loadSchedule(); }
                    }}>Cancelar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Non-class days section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Dias sem Aula</h3>
          <Button variant="outline" size="sm" onClick={() => setNcdModal(true)}>Adicionar</Button>
        </div>
        {nonClassDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum dia sem aula cadastrado.</p>
        ) : (
          <div className="space-y-1">
            {nonClassDays.map(ncd => (
              <div key={ncd.id} className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200">
                <span className="text-sm">{new Date(ncd.date + 'T12:00:00').toLocaleDateString('pt-BR')} — {ncd.reason}</span>
                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeNonClassDay(ncd.id)}>Remover</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recurring bookings section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Agendamentos Recorrentes</h3>
          <Button variant="outline" size="sm" onClick={() => setRecurModal(true)}>Novo Recorrente</Button>
        </div>
        {recurringBookings.filter(r => r.active).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum agendamento recorrente ativo.</p>
        ) : (
          <div className="space-y-1">
            {recurringBookings.filter(r => r.active).map(r => (
              <div key={r.id} className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-200">
                <span className="text-sm">{r.studentName} — {DAY_NAMES[r.dayOfWeek]} {r.startTime}-{r.endTime} ({teachers.find(t => t.id === r.teacherId)?.name})</span>
                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deactivateRecurring(r.id)}>Desativar</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal (Coordinator) */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode === 'cancel' ? 'Cancelar Agendamento' : 'Agendar / Bloquear Horário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Professor selector */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Professor *</Label>
              <Select value={editTeacherId} onValueChange={handleEditTeacherChange}>
                <SelectTrigger><SelectValue placeholder="Selecione o professor" /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Data</Label>
              <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            </div>

            {/* Day of week (from available slots) */}
            {editTeacherId && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Dia da semana</Label>
                <Select value={editDayOfWeek} onValueChange={setEditDayOfWeek}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[...new Set(teacherAvailSlots.map(s => s.dayOfWeek))].sort().map(d => (
                      <SelectItem key={d} value={String(d)}>{DAY_NAMES[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Time (from available slots) */}
            {editTeacherId && editDayOfWeek && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Horário</Label>
                <Select value={`${editStartTime}-${editEndTime}`} onValueChange={v => {
                  const [s, e] = v.split('-');
                  setEditStartTime(s);
                  setEditEndTime(e);
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {getAvailableTimesForDay().map(s => (
                      <SelectItem key={`${s.startTime}-${s.endTime}`} value={`${s.startTime}-${s.endTime}`}>
                        {s.startTime} — {s.endTime}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Student fields */}
            {editMode !== 'cancel' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nome do aluno</Label>
                  <Input value={editStudentName} onChange={e => setEditStudentName(e.target.value)} placeholder="Ex: Ana Souza" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">E-mail do aluno (opcional)</Label>
                  <Input type="email" value={editStudentEmail} onChange={e => setEditStudentEmail(e.target.value)} placeholder="ana@email.com" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <BookOpen className="size-3" />
                    Matéria / Livro / Observações
                  </Label>
                  <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Ex: Livro 1 - Teens, Aula de inglês..." rows={2} className="resize-none" />
                </div>
              </>
            )}

            {editMode === 'cancel' && (
              <div className="bg-blue-50 p-3 rounded text-sm">
                <p><strong>Aluno:</strong> {editStudentName}</p>
                {editStudentEmail && <p><strong>E-mail:</strong> {editStudentEmail}</p>}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            {editMode === 'cancel' ? (
              <Button variant="destructive" onClick={handleSaveBooking}>Cancelar Agendamento</Button>
            ) : (
              <>
                <Button onClick={handleSaveBooking} className="bg-emerald-700 hover:bg-emerald-800">Agendar</Button>
                <Button variant="outline" onClick={handleBlockSlot}>Bloquear</Button>
              </>
            )}
            <Button variant="ghost" onClick={() => setEditModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Non-class day modal */}
      <Dialog open={ncdModal} onOpenChange={setNcdModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cadastrar Dia sem Aula</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Todos os professores ficarão bloqueados neste dia.</p>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={ncdDate} onChange={e => setNcdDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Motivo</Label>
              <Input value={ncdReason} onChange={e => setNcdReason(e.target.value)} placeholder="Ex: Recesso escolar" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNcdModal(false)}>Cancelar</Button>
            <Button onClick={addNonClassDay} className="bg-amber-600 hover:bg-amber-700">Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recurring modal */}
      <Dialog open={recurModal} onOpenChange={setRecurModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agendamento Recorrente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Crie um horário fixo semanal. Ex: &quot;Ana — toda segunda às 14h&quot;</p>
            <div className="space-y-1">
              <Label>Professor</Label>
              <Select value={recurData.teacherId} onValueChange={v => setRecurData({...recurData, teacherId: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Nome do aluno</Label><Input value={recurData.studentName} onChange={e => setRecurData({...recurData, studentName: e.target.value})} /></div>
              <div className="space-y-1"><Label>E-mail (opcional)</Label><Input value={recurData.studentEmail} onChange={e => setRecurData({...recurData, studentEmail: e.target.value})} /></div>
            </div>
            <div className="space-y-1">
              <Label>Dia da semana</Label>
              <Select value={recurData.dayOfWeek} onValueChange={v => setRecurData({...recurData, dayOfWeek: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((d, i) => i > 0 ? <SelectItem key={i} value={String(i)}>{d}</SelectItem> : null)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Início</Label><Input type="time" value={recurData.startTime} onChange={e => setRecurData({...recurData, startTime: e.target.value})} /></div>
              <div className="space-y-1"><Label>Fim</Label><Input type="time" value={recurData.endTime} onChange={e => setRecurData({...recurData, endTime: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecurModal(false)}>Cancelar</Button>
            <Button onClick={createRecurringBooking} className="bg-purple-700 hover:bg-purple-800">Criar Recorrente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
