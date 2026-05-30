'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  Search,
  Plus,
  Users,
  Phone,
  UserCircle,
  Eye,
  Pencil,
  Trash2,
  BookOpen,
  CalendarCheck,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

interface ClassItem {
  id: string
  name: string
  subject: string
  teacher: {
    id: string
    user: { name: string }
  }
}

interface StudentClassInfo {
  id: string
  classId: string
  class: ClassItem
}

interface Student {
  id: string
  userId: string
  responsibleName: string
  notes: string
  attendanceCount: number
  user: {
    id: string
    name: string
    email: string
    phone: string
  }
  classStudents: StudentClassInfo[]
  attendance: Array<{
    id: string
    status: string
  }>
}

interface StudentFormData {
  name: string
  phone: string
  responsibleName: string
  email: string
  password: string
  classId: string
  notes: string
}

const emptyForm: StudentFormData = {
  name: '',
  phone: '',
  responsibleName: '',
  email: '',
  password: '',
  classId: '',
  notes: '',
}

export default function AlunosPage() {
  const { authFetch } = useAppStore()
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialogs
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [form, setForm] = useState<StudentFormData>(emptyForm)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [saving, setSaving] = useState(false)

  const loadStudents = useCallback(async () => {
    try {
      const res = await authFetch('/api/students')
      if (res.ok) {
        const data = await res.json()
        setStudents(data)
      }
    } catch (err) {
      console.error('Erro ao carregar alunos:', err)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  const loadClasses = useCallback(async () => {
    try {
      const res = await authFetch('/api/classes')
      if (res.ok) {
        const data = await res.json()
        setClasses(data)
      }
    } catch (err) {
      console.error('Erro ao carregar turmas:', err)
    }
  }, [authFetch])

  useEffect(() => {
    loadStudents()
    loadClasses()
  }, [loadStudents, loadClasses])

  const filteredStudents = students.filter((s) => {
    const term = search.toLowerCase()
    const classNames = s.classStudents
      .map((cs) => cs.class.name)
      .join(' ')
      .toLowerCase()
    return (
      s.user.name.toLowerCase().includes(term) ||
      s.user.phone.toLowerCase().includes(term) ||
      s.responsibleName.toLowerCase().includes(term) ||
      classNames.includes(term)
    )
  })

  const getClassName = (student: Student) => {
    if (student.classStudents.length === 0) return '—'
    return student.classStudents.map((cs) => cs.class.name).join(', ')
  }

  const getSubjects = (student: Student) => {
    if (student.classStudents.length === 0) return '—'
    return student.classStudents.map((cs) => cs.class.subject).join(', ')
  }

  const getFaltas = (student: Student) => {
    if (!student.attendance) return 0
    return student.attendance.filter((a) => a.status === 'absent').length
  }

  const getUpcomingClasses = (student: Student) => {
    return student.classStudents.length
  }

  // CRUD handlers
  const handleAdd = async () => {
    if (!form.name || !form.password) {
      toast.error('Preencha o nome e a senha do aluno.')
      return
    }
    setSaving(true)
    try {
      const res = await authFetch('/api/students', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          responsibleName: form.responsibleName,
          notes: form.notes,
        }),
      })
      if (res.ok) {
        const newStudent = await res.json()

        // Assign to class if selected
        if (form.classId) {
          try {
            await authFetch(`/api/classes/${form.classId}/students`, {
              method: 'POST',
              body: JSON.stringify({ studentId: newStudent.id }),
            })
          } catch {
            // Non-blocking: student is created even if class assignment fails
          }
        }

        toast.success('Aluno criado com sucesso!')
        setAddOpen(false)
        setForm(emptyForm)
        loadStudents()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao criar aluno.')
      }
    } catch {
      toast.error('Erro de conexão ao criar aluno.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedStudent || !form.name) {
      toast.error('Preencha o nome do aluno.')
      return
    }
    setSaving(true)
    try {
      const res = await authFetch(`/api/students/${selectedStudent.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          email: form.email || undefined,
          phone: form.phone,
          responsibleName: form.responsibleName,
          notes: form.notes,
        }),
      })
      if (res.ok) {
        toast.success('Aluno atualizado com sucesso!')
        setEditOpen(false)
        setSelectedStudent(null)
        setForm(emptyForm)
        loadStudents()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao atualizar aluno.')
      }
    } catch {
      toast.error('Erro de conexão ao atualizar aluno.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedStudent) return
    setSaving(true)
    try {
      const res = await authFetch(`/api/students/${selectedStudent.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Aluno excluído com sucesso!')
        setDeleteOpen(false)
        setSelectedStudent(null)
        loadStudents()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao excluir aluno.')
      }
    } catch {
      toast.error('Erro de conexão ao excluir aluno.')
    } finally {
      setSaving(false)
    }
  }

  const openEditDialog = (student: Student) => {
    setSelectedStudent(student)
    setForm({
      name: student.user.name,
      phone: student.user.phone,
      responsibleName: student.responsibleName,
      email: student.user.email.includes('@horivoo.local') ? '' : student.user.email,
      password: '',
      classId: student.classStudents.length > 0 ? student.classStudents[0].classId : '',
      notes: student.notes,
    })
    setEditOpen(true)
  }

  const openDeleteDialog = (student: Student) => {
    setSelectedStudent(student)
    setDeleteOpen(true)
  }

  const openProfileDialog = (student: Student) => {
    setSelectedStudent(student)
    setProfileOpen(true)
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-600" />
            Alunos
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os alunos da instituição
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm)
            setAddOpen(true)
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Aluno
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone, responsável ou turma..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {search ? 'Nenhum aluno encontrado para esta busca.' : 'Nenhum aluno cadastrado ainda.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Telefone</TableHead>
                    <TableHead className="hidden lg:table-cell">Responsável</TableHead>
                    <TableHead className="hidden lg:table-cell">Turma</TableHead>
                    <TableHead className="hidden xl:table-cell">Matérias</TableHead>
                    <TableHead className="hidden xl:table-cell">Faltas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.user.name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {student.user.phone || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {student.responsibleName || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {student.classStudents.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {student.classStudents.map((cs) => (
                              <Badge key={cs.id} variant="secondary" className="text-xs">
                                {cs.class.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                        {getSubjects(student)}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <Badge
                          variant={getFaltas(student) > 3 ? 'destructive' : 'outline'}
                          className="gap-1"
                        >
                          {getFaltas(student) > 3 && <AlertTriangle className="h-3 w-3" />}
                          {getFaltas(student)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openProfileDialog(student)}
                            title="Ver Perfil"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(student)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(student)}
                            title="Excluir"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Aluno</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo aluno.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-name">Nome *</Label>
              <Input
                id="add-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-phone">Telefone</Label>
              <Input
                id="add-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-responsible">Responsável</Label>
              <Input
                id="add-responsible"
                value={form.responsibleName}
                onChange={(e) => setForm({ ...form, responsibleName: e.target.value })}
                placeholder="Nome do responsável"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-email">
                Email{' '}
                <span className="text-muted-foreground font-normal text-xs">
                  (opcional)
                </span>
              </Label>
              <Input
                id="add-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
              <p className="text-xs text-muted-foreground">
                Se não informado, um email automático será gerado.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-password">Senha *</Label>
              <Input
                id="add-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Senha de acesso"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-class">Turma</Label>
              <Select
                value={form.classId}
                onValueChange={(val) => setForm({ ...form, classId: val })}
              >
                <SelectTrigger id="add-class">
                  <SelectValue placeholder="Selecione uma turma" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} — {cls.subject} ({cls.teacher.user.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-notes">Observações</Label>
              <Textarea
                id="add-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observações sobre o aluno..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? 'Salvando...' : 'Criar Aluno'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
            <DialogDescription>
              Atualize os dados do aluno.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-responsible">Responsável</Label>
              <Input
                id="edit-responsible"
                value={form.responsibleName}
                onChange={(e) => setForm({ ...form, responsibleName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">
                Email{' '}
                <span className="text-muted-foreground font-normal text-xs">
                  (opcional)
                </span>
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Observações</Label>
              <Textarea
                id="edit-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o aluno{' '}
              <strong>{selectedStudent?.user.name}</strong>? Esta ação não pode ser
              desfeita e todos os dados associados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? 'Excluindo...' : 'Excluir Aluno'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perfil do Aluno</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              {/* Student Info */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40">
                  <UserCircle className="h-8 w-8 text-amber-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold">{selectedStudent.user.name}</h3>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {selectedStudent.user.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedStudent.user.phone}
                      </span>
                    )}
                    {selectedStudent.responsibleName && (
                      <span className="flex items-center gap-1">
                        Responsável: {selectedStudent.responsibleName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedStudent.notes && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Observações</h4>
                  <p className="text-sm text-muted-foreground p-3 rounded-lg border bg-card">
                    {selectedStudent.notes}
                  </p>
                </div>
              )}

              {/* Classes */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  Turmas
                </h4>
                {selectedStudent.classStudents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStudent.classStudents.map((cs) => (
                      <div
                        key={cs.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div>
                          <p className="font-medium text-sm">{cs.class.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {cs.class.subject} — Prof. {cs.class.teacher.user.name}
                          </p>
                        </div>
                        <Badge variant="secondary">{cs.class.subject}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma turma atribuída.
                  </p>
                )}
              </div>

              {/* Attendance / Faltas Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {getFaltas(selectedStudent)}
                    </p>
                    <p className="text-xs text-muted-foreground">Faltas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {selectedStudent.attendance
                        ? selectedStudent.attendance.filter((a) => a.status === 'present').length
                        : 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Presenças</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
