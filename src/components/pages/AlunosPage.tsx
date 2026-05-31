'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Eye, Users, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  userId: string;
  createdAt: string;
  responsibleName?: string;
  notes?: string;
}

interface Booking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  studentName: string;
  teacherName?: string;
  status: string;
  teacher?: { name: string };
}

export function AlunosPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [studentBookings, setStudentBookings] = useState<Booking[]>([]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    responsibleName: '',
    notes: '',
  });

  const loadStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      setStudents(data.students || []);
    } catch {
      toast.error('Erro ao carregar alunos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

  const openCreate = () => {
    setEditingStudent(null);
    setForm({ name: '', email: '', phone: '', responsibleName: '', notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    setForm({
      name: student.name,
      email: student.email,
      phone: student.phone,
      responsibleName: student.responsibleName || '',
      notes: student.notes || '',
    });
    setDialogOpen(true);
  };

  const openProfile = async (student: Student) => {
    setViewingStudent(student);
    setProfileOpen(true);
    try {
      const res = await fetch(`/api/appointments?studentId=${student.id}`);
      const data = await res.json();
      setStudentBookings(data.appointments || []);
    } catch {
      setStudentBookings([]);
    }
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!form.phone) {
      toast.error('Telefone é obrigatório');
      return;
    }
    if (!form.responsibleName) {
      toast.error('Nome do responsável é obrigatório');
      return;
    }

    try {
      if (editingStudent) {
        const res = await fetch(`/api/students/${editingStudent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        toast.success('Aluno atualizado com sucesso');
      } else {
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        toast.success('Aluno criado com sucesso');
      }
      setDialogOpen(false);
      loadStudents();
    } catch {
      toast.error('Erro ao salvar aluno');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este aluno?')) return;
    try {
      await fetch(`/api/students/${id}`, { method: 'DELETE' });
      toast.success('Aluno excluído');
      loadStudents();
    } catch {
      toast.error('Erro ao excluir aluno');
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

  const statusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'cancelled': return 'Cancelado';
      case 'completed': return 'Concluído';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alunos</h1>
          <p className="text-muted-foreground">Gerencie os alunos cadastrados</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="size-4 mr-2" />
          Novo Aluno
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar alunos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4"><div className="h-12 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Users className="size-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum aluno encontrado</p>
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
                  <TableHead>Telefone</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-muted-foreground">{student.email || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{student.phone || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{student.responsibleName || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {student.createdAt
                        ? format(parseISO(student.createdAt), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openProfile(student)}>
                            <Eye className="size-4 mr-2" />
                            Ver Agendamentos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(student)}>
                            <Pencil className="size-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(student.id)}
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
            <DialogTitle>{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</DialogTitle>
            <DialogDescription>
              {editingStudent ? 'Atualize os dados do aluno' : 'Preencha os dados do novo aluno'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Nome do aluno"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do Responsável *</Label>
              <Input
                placeholder="Nome do responsável pelo aluno"
                value={form.responsibleName}
                onChange={(e) => setForm({ ...form, responsibleName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email (opcional)</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Input
                placeholder="Observações sobre o aluno"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
              {editingStudent ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Profile / Bookings Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agendamentos do Aluno</DialogTitle>
            <DialogDescription>{viewingStudent?.name}</DialogDescription>
          </DialogHeader>

          {viewingStudent && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
                {viewingStudent.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground" />
                    <span className="text-sm">{viewingStudent.email}</span>
                  </div>
                )}
                {viewingStudent.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" />
                    <span className="text-sm">{viewingStudent.phone}</span>
                  </div>
                )}
                {viewingStudent.responsibleName && (
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-muted-foreground" />
                    <span className="text-sm">Responsável: {viewingStudent.responsibleName}</span>
                  </div>
                )}
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Agendamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  {studentBookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado</p>
                  ) : (
                    <div className="space-y-2">
                      {studentBookings.map((booking) => (
                        <div key={booking.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {booking.teacher?.name || 'Professor'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(booking.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} • {booking.startTime}-{booking.endTime}
                            </p>
                          </div>
                          <Badge className={statusColor(booking.status)}>
                            {statusLabel(booking.status)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
