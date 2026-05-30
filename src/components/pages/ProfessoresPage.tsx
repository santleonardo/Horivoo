'use client';

import { authFetch } from '@/lib/store';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Eye, GraduationCap, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects: string;
  bio: string;
  availableSlots: { id: string; dayOfWeek: number; startTime: string; endTime: string }[];
  blockedPeriods: { id: string; startDate: string; endDate: string; reason: string | null }[];
}

interface SlotForm {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function ProfessoresPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);

  const [form, setForm] = useState({ name: '', email: '', subjects: '', bio: '' });
  const [slotForm, setSlotForm] = useState<SlotForm>({ dayOfWeek: 1, startTime: '08:00', endTime: '09:00' });

  const loadTeachers = useCallback(async () => {
    try {
      const res = await authFetch('/api/teachers');
      const data = await res.json();
      setTeachers(data.teachers || []);
    } catch {
      toast.error('Erro ao carregar professores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const filtered = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.subjects.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingTeacher(null);
    setForm({ name: '', email: '', subjects: '', bio: '' });
    setDialogOpen(true);
  };

  const openEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setForm({ name: teacher.name, email: teacher.email, subjects: teacher.subjects, bio: teacher.bio });
    setDialogOpen(true);
  };

  const openProfile = (teacher: Teacher) => {
    setViewingTeacher(teacher);
    setProfileOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.error('Nome e email são obrigatórios');
      return;
    }

    try {
      if (editingTeacher) {
        const res = await authFetch(`/api/teachers/${editingTeacher.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        toast.success('Professor atualizado com sucesso');
      } else {
        const res = await authFetch('/api/teachers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        toast.success('Professor criado com sucesso');
      }
      setDialogOpen(false);
      loadTeachers();
    } catch {
      toast.error('Erro ao salvar professor');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este professor?')) return;
    try {
      await authFetch(`/api/teachers/${id}`, { method: 'DELETE' });
      toast.success('Professor excluído');
      loadTeachers();
    } catch {
      toast.error('Erro ao excluir professor');
    }
  };

  const addSlot = async () => {
    if (!viewingTeacher) return;
    try {
      const res = await authFetch(`/api/teachers/${viewingTeacher.id}/available-slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slotForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro');
      }
      toast.success('Horário adicionado');
      // Reload teachers and update viewingTeacher
      const teachersRes = await authFetch('/api/teachers');
      const teachersData = await teachersRes.json();
      setTeachers(teachersData.teachers || []);
      const updated = teachersData.teachers?.find((t: Teacher) => t.id === viewingTeacher.id);
      if (updated) setViewingTeacher(updated);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar horário');
    }
  };

  const removeSlot = async (slotId: string) => {
    if (!viewingTeacher) return;
    try {
      await authFetch(`/api/teachers/${viewingTeacher.id}/available-slots?slotId=${slotId}`, {
        method: 'DELETE',
      });
      toast.success('Horário removido');
      const teachersRes = await authFetch('/api/teachers');
      const teachersData = await teachersRes.json();
      setTeachers(teachersData.teachers || []);
      const updated = teachersData.teachers?.find((t: Teacher) => t.id === viewingTeacher.id);
      if (updated) setViewingTeacher(updated);
    } catch {
      toast.error('Erro ao remover horário');
    }
  };

  const slotsByDay = viewingTeacher
    ? viewingTeacher.availableSlots.reduce(
        (acc, slot) => {
          if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
          acc[slot.dayOfWeek].push(slot);
          return acc;
        },
        {} as Record<number, typeof viewingTeacher.availableSlots>
      )
    : {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Professores</h1>
          <p className="text-muted-foreground">Gerencie os professores e suas disponibilidades</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="size-4 mr-2" />
          Novo Professor
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar professores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-12 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <GraduationCap className="size-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum professor encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Disciplinas</TableHead>
                  <TableHead>Horários</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">{teacher.name}</TableCell>
                    <TableCell className="text-muted-foreground">{teacher.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {teacher.subjects
                          ? teacher.subjects
                              .split(',')
                              .filter(Boolean)
                              .map((s, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {s.trim()}
                                </Badge>
                              ))
                          : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="size-3 text-muted-foreground" />
                        <span className="text-sm">{teacher.availableSlots.length} horários</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openProfile(teacher)}>
                            <Eye className="size-4 mr-2" />
                            Ver Perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(teacher)}>
                            <Pencil className="size-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(teacher.id)}
                          >
                            <Trash2 className="size-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTeacher ? 'Editar Professor' : 'Novo Professor'}</DialogTitle>
            <DialogDescription>
              {editingTeacher ? 'Atualize os dados do professor' : 'Preencha os dados do novo professor'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Nome do professor"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Disciplinas</Label>
              <Input
                placeholder="Matemática, Física, Química (separadas por vírgula)"
                value={form.subjects}
                onChange={(e) => setForm({ ...form, subjects: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                placeholder="Breve descrição do professor..."
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
              {editingTeacher ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perfil do Professor</DialogTitle>
            <DialogDescription>
              {viewingTeacher?.name} — {viewingTeacher?.email}
            </DialogDescription>
          </DialogHeader>

          {viewingTeacher && (
            <div className="space-y-6">
              {/* Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Disciplinas</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {viewingTeacher.subjects
                      ? viewingTeacher.subjects
                          .split(',')
                          .filter(Boolean)
                          .map((s, i) => (
                            <Badge key={i} variant="secondary">
                              {s.trim()}
                            </Badge>
                          ))
                      : <span className="text-sm text-muted-foreground">Nenhuma</span>}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Bio</Label>
                  <p className="text-sm mt-1">{viewingTeacher.bio || 'Sem descrição'}</p>
                </div>
              </div>

              {/* Add Slot */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Adicionar Horário</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 items-end flex-wrap">
                    <div className="space-y-1">
                      <Label className="text-xs">Dia</Label>
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={slotForm.dayOfWeek}
                        onChange={(e) => setSlotForm({ ...slotForm, dayOfWeek: Number(e.target.value) })}
                      >
                        {dayNames.map((d, i) => (
                          <option key={i} value={i}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Início</Label>
                      <Input
                        type="time"
                        value={slotForm.startTime}
                        onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                        className="w-28"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fim</Label>
                      <Input
                        type="time"
                        value={slotForm.endTime}
                        onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                        className="w-28"
                      />
                    </div>
                    <Button onClick={addSlot} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="size-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current Slots */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Horários Disponíveis</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(slotsByDay).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum horário cadastrado</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(slotsByDay)
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([day, slots]) => (
                          <div key={day}>
                            <p className="text-sm font-medium text-emerald-700 mb-1">
                              {dayNames[Number(day)]}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {slots
                                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                .map((slot) => (
                                  <Badge
                                    key={slot.id}
                                    variant="outline"
                                    className="flex items-center gap-1 px-3 py-1"
                                  >
                                    <Clock className="size-3" />
                                    {slot.startTime} - {slot.endTime}
                                    <button
                                      onClick={() => removeSlot(slot.id)}
                                      className="ml-1 text-muted-foreground hover:text-destructive"
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Blocked Periods */}
              {viewingTeacher.blockedPeriods && viewingTeacher.blockedPeriods.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Períodos Bloqueados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {viewingTeacher.blockedPeriods.map((bp) => (
                        <div key={bp.id} className="flex items-center gap-2 p-2 rounded bg-red-50 text-sm">
                          <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
                          <span>{bp.startDate} — {bp.endDate}</span>
                          {bp.reason && <span className="text-muted-foreground">({bp.reason})</span>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
