'use client';

/**
 * TurmasPage.tsx — Gestão completa de turmas (classes).
 * Coordenador: CRUD completo
 * Professor: visualiza apenas suas turmas
 * Aluno: visualiza turmas em que está matriculado
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, authFetch } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Layers,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Users,
  GraduationCap,
  BookOpen,
  Search,
  Loader2,
  UserPlus,
  UserMinus,
  Calendar,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ------------------------------------------------------------------ */

interface Turma {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  teacher?: { id: string; name: string; subjects: string };
  students?: { id: string; name: string; email: string }[];
  _count?: { students: number };
  createdAt: string;
}

interface Teacher {
  id: string;
  name: string;
  subjects: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
}

interface Booking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  studentName: string;
  status: string;
  bookingType: string;
}

interface Test {
  id: string;
  title: string;
  date: string;
  className: string;
}

/* ------------------------------------------------------------------ */

export function TurmasPage() {
  const { user } = useAuthStore();
  const isCoordinator = user?.role === 'coordinator';

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [addStudentOpen, setAddStudentOpen] = useState(false);

  // Form
  const [form, setForm] = useState({ name: '', subject: '', teacherId: '' });

  // Detail data
  const [turmaBookings, setTurmaBookings] = useState<Booking[]>([]);
  const [turmaTests, setTurmaTests] = useState<Test[]>([]);
  const [turmaStudents, setTurmaStudents] = useState<Student[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Add student
  const [selectedStudentId, setSelectedStudentId] = useState('');

  /* ---- Load data ---- */
  const loadData = useCallback(async () => {
    try {
      const [cRes, tRes, sRes] = await Promise.all([
        authFetch('/api/classes'),
        authFetch('/api/teachers'),
        authFetch('/api/students'),
      ]);
      const cData = await cRes.json();
      const tData = await tRes.json();
      const sData = await sRes.json();
      setTurmas(cData.classes || []);
      setTeachers(tData.teachers || []);
      setAllStudents(sData.students || []);
    } catch {
      toast.error('Erro ao carregar turmas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ---- Filtered ---- */
  const filtered = turmas.filter(t => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.teacher?.name?.toLowerCase().includes(q)
    );
  });

  /* ---- CRUD ---- */
  const openCreate = () => {
    setEditingTurma(null);
    setForm({ name: '', subject: '', teacherId: '' });
    setDialogOpen(true);
  };

  const openEdit = (turma: Turma) => {
    setEditingTurma(turma);
    setForm({ name: turma.name, subject: turma.subject, teacherId: turma.teacherId });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.teacherId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingTurma) {
        const res = await authFetch(`/api/classes/${editingTurma.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        toast.success('Turma atualizada com sucesso');
      } else {
        const res = await authFetch('/api/classes', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        toast.success('Turma criada com sucesso');
      }
      setDialogOpen(false);
      loadData();
    } catch {
      toast.error('Erro ao salvar turma');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta turma?')) return;
    try {
      await authFetch(`/api/classes/${id}`, { method: 'DELETE' });
      toast.success('Turma excluída');
      loadData();
    } catch {
      toast.error('Erro ao excluir turma');
    }
  };

  /* ---- Detail view ---- */
  const openDetail = async (turma: Turma) => {
    setSelectedTurma(turma);
    setDetailOpen(true);
    setDetailLoading(true);

    try {
      const [bRes, tRes] = await Promise.all([
        authFetch(`/api/bookings?classId=${turma.id}`),
        authFetch(`/api/tests?classId=${turma.id}`),
      ]);
      const bData = await bRes.json();
      const tData = await tRes.json();
      setTurmaBookings(bData.bookings || []);
      setTurmaTests(tData.tests || []);

      // Load class students
      const cRes = await authFetch(`/api/classes/${turma.id}/students`);
      const cData = await cRes.json();
      setTurmaStudents(cData.students || []);
    } catch {
      setTurmaBookings([]);
      setTurmaTests([]);
      setTurmaStudents([]);
    } finally {
      setDetailLoading(false);
    }
  };

  /* ---- Add/Remove student ---- */
  const handleAddStudent = async () => {
    if (!selectedTurma || !selectedStudentId) return;
    try {
      const res = await authFetch(`/api/classes/${selectedTurma.id}/students`, {
        method: 'POST',
        body: JSON.stringify({ studentId: selectedStudentId }),
      });
      if (!res.ok) throw new Error();
      toast.success('Aluno adicionado à turma');
      setAddStudentOpen(false);
      setSelectedStudentId('');
      openDetail(selectedTurma);
    } catch {
      toast.error('Erro ao adicionar aluno');
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedTurma) return;
    if (!confirm('Remover este aluno da turma?')) return;
    try {
      const res = await authFetch(`/api/classes/${selectedTurma.id}/students`, {
        method: 'DELETE',
        body: JSON.stringify({ studentId }),
      });
      if (!res.ok) throw new Error();
      toast.success('Aluno removido da turma');
      openDetail(selectedTurma);
    } catch {
      toast.error('Erro ao remover aluno');
    }
  };

  /* ---- Available students to add (not already in the class) ---- */
  const availableStudents = allStudents.filter(
    s => !turmaStudents.some(ts => ts.id === s.id)
  );

  /* ---- Render ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-60 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" />
        Carregando turmas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Turmas</h1>
          <p className="text-sm text-muted-foreground">
            {isCoordinator ? 'Gerencie as turmas e suas composições' : 'Visualize suas turmas'}
          </p>
        </div>
        {isCoordinator && (
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="size-4 mr-2" />
            Nova Turma
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome, disciplina ou professor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Layers className="size-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma turma encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Disciplina</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Alunos</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(turma => (
                  <TableRow key={turma.id}>
                    <TableCell className="font-medium">{turma.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{turma.subject}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {turma.teacher?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        <Users className="size-3 mr-1" />
                        {turma._count?.students ?? turma.students?.length ?? 0}
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
                          <DropdownMenuItem onClick={() => openDetail(turma)}>
                            <Eye className="size-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          {isCoordinator && (
                            <>
                              <DropdownMenuItem onClick={() => openEdit(turma)}>
                                <Pencil className="size-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(turma.id)}
                              >
                                <Trash2 className="size-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </>
                          )}
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
            <DialogTitle>{editingTurma ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
            <DialogDescription>
              {editingTurma ? 'Atualize os dados da turma' : 'Preencha os dados da nova turma'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Matemática 9º Ano A"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Disciplina *</Label>
              <Input
                placeholder="Ex: Matemática"
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Professor *</Label>
              <Select value={form.teacherId} onValueChange={v => setForm({ ...form, teacherId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o professor" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}{t.subjects ? ` — ${t.subjects.split(',').slice(0, 2).join(', ')}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
              {editingTurma ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Class Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5 text-emerald-600" />
              {selectedTurma?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTurma?.subject} — Prof. {selectedTurma?.teacher?.name || '—'}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              Carregando detalhes...
            </div>
          ) : selectedTurma && (
            <div className="space-y-6">
              {/* Info cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="border-emerald-100">
                  <CardContent className="p-4 text-center">
                    <GraduationCap className="size-5 text-emerald-600 mx-auto mb-1" />
                    <p className="text-sm font-medium">{selectedTurma.teacher?.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">Professor</p>
                  </CardContent>
                </Card>
                <Card className="border-blue-100">
                  <CardContent className="p-4 text-center">
                    <BookOpen className="size-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-sm font-medium">{selectedTurma.subject}</p>
                    <p className="text-xs text-muted-foreground">Disciplina</p>
                  </CardContent>
                </Card>
                <Card className="border-amber-100">
                  <CardContent className="p-4 text-center">
                    <Users className="size-5 text-amber-600 mx-auto mb-1" />
                    <p className="text-sm font-medium">{turmaStudents.length}</p>
                    <p className="text-xs text-muted-foreground">Alunos</p>
                  </CardContent>
                </Card>
              </div>

              {/* Student list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Users className="size-4" />
                    Alunos da Turma
                  </h3>
                  {isCoordinator && (
                    <Button size="sm" variant="outline" onClick={() => setAddStudentOpen(true)}>
                      <UserPlus className="size-3.5 mr-1" />
                      Adicionar Aluno
                    </Button>
                  )}
                </div>
                {turmaStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum aluno nesta turma
                  </p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {turmaStudents.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                        <div>
                          <span className="font-medium">{s.name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{s.email}</span>
                        </div>
                        {isCoordinator && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveStudent(s.id)}
                          >
                            <UserMinus className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming classes */}
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Calendar className="size-4" />
                  Próximas Aulas
                </h3>
                {turmaBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma aula agendada</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {turmaBookings.slice(0, 10).map(b => (
                      <div key={b.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 text-sm">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {format(parseISO(b.date), 'dd/MM', { locale: ptBR })}
                        </Badge>
                        <span>{b.startTime} - {b.endTime}</span>
                        <span className="text-muted-foreground">{b.studentName}</span>
                        <Badge variant="secondary" className={`text-xs ml-auto ${
                          b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                          b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {b.status === 'confirmed' ? 'Confirmada' : b.status === 'cancelled' ? 'Cancelada' : 'Concluída'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming tests */}
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <FileText className="size-4" />
                  Próximas Provas
                </h3>
                {turmaTests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma prova agendada</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {turmaTests.map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg bg-purple-50/50 text-sm">
                        <FileText className="size-4 text-purple-500 shrink-0" />
                        <span className="font-medium">{t.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {format(parseISO(t.date), "dd 'de' MMM", { locale: ptBR })}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Aluno à Turma</DialogTitle>
            <DialogDescription>{selectedTurma?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o aluno" />
              </SelectTrigger>
              <SelectContent>
                {availableStudents.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Todos os alunos já estão nesta turma
                  </div>
                ) : (
                  availableStudents.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStudentOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleAddStudent}
              disabled={!selectedStudentId}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
