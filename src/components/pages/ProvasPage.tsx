'use client';

/**
 * ProvasPage.tsx — Gestão de provas.
 * Coordenador: CRUD completo
 * Professor: visualiza provas de suas turmas
 * Aluno: visualiza provas de suas turmas
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
  FileText,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ------------------------------------------------------------------ */

interface Test {
  id: string;
  title: string;
  date: string;
  classId: string;
  class?: { id: string; name: string; subject: string };
  description?: string;
  createdAt: string;
}

interface Turma {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
}

/* ------------------------------------------------------------------ */

export function ProvasPage() {
  const { user } = useAuthStore();
  const isCoordinator = user?.role === 'coordinator';

  const [tests, setTests] = useState<Test[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [form, setForm] = useState({ title: '', date: '', classId: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  /* ---- Load ---- */
  const loadData = useCallback(async () => {
    try {
      const [tRes, cRes] = await Promise.all([
        authFetch('/api/tests'),
        authFetch('/api/classes'),
      ]);
      const tData = await tRes.json();
      const cData = await cRes.json();
      setTests(tData.tests || []);
      setTurmas(cData.classes || []);
    } catch {
      toast.error('Erro ao carregar provas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ---- Filtered ---- */
  const filtered = tests.filter(t => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.class?.name?.toLowerCase().includes(q) ||
      t.class?.subject?.toLowerCase().includes(q)
    );
  });

  /* ---- CRUD ---- */
  const openCreate = () => {
    setEditingTest(null);
    setForm({ title: '', date: '', classId: '', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (test: Test) => {
    setEditingTest(test);
    setForm({
      title: test.title,
      date: test.date,
      classId: test.classId,
      description: test.description || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.date || !form.classId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);
    try {
      if (editingTest) {
        const res = await authFetch(`/api/tests/${editingTest.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        toast.success('Prova atualizada com sucesso');
      } else {
        const res = await authFetch('/api/tests', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        toast.success('Prova criada com sucesso');
      }
      setDialogOpen(false);
      loadData();
    } catch {
      toast.error('Erro ao salvar prova');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta prova?')) return;
    try {
      await authFetch(`/api/tests/${id}`, { method: 'DELETE' });
      toast.success('Prova excluída');
      loadData();
    } catch {
      toast.error('Erro ao excluir prova');
    }
  };

  /* ---- Status badge based on date ---- */
  const getDateBadge = (dateStr: string) => {
    const testDate = parseISO(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    testDate.setHours(0, 0, 0, 0);

    if (testDate < today) {
      return <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">Realizada</Badge>;
    } else if (testDate.getTime() === today.getTime()) {
      return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">Hoje</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">Agendada</Badge>;
    }
  };

  /* ---- Render ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-60 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" />
        Carregando provas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Provas</h1>
          <p className="text-sm text-muted-foreground">
            {isCoordinator ? 'Gerencie as provas agendadas' : 'Provas de suas turmas'}
          </p>
        </div>
        {isCoordinator && (
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="size-4 mr-2" />
            Nova Prova
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por título, turma ou disciplina..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileText className="size-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma prova encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  {isCoordinator && <TableHead className="w-[80px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(test => (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-purple-500 shrink-0" />
                        {test.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <BookOpen className="size-3.5 text-muted-foreground" />
                        <span>{test.class?.name || '—'}</span>
                        {test.class?.subject && (
                          <Badge variant="outline" className="text-xs ml-1">{test.class.subject}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        {format(parseISO(test.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>{getDateBadge(test.date)}</TableCell>
                    {isCoordinator && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(test)}>
                              <Pencil className="size-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(test.id)}
                            >
                              <Trash2 className="size-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
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
            <DialogTitle>{editingTest ? 'Editar Prova' : 'Nova Prova'}</DialogTitle>
            <DialogDescription>
              {editingTest ? 'Atualize os dados da prova' : 'Agende uma nova prova'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Prova de Matemática - 1º Bimestre"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Turma *</Label>
              <Select value={form.classId} onValueChange={v => setForm({ ...form, classId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {turmas.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} — {t.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Ex: Capítulos 1-5"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingTest ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
