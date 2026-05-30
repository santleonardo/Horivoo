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
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck,
  Eye,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'

interface TeacherAvailability {
  id: string
  weekday: number
  startTime: string
  endTime: string
}

interface TeacherClass {
  id: string
  name: string
  subject: string
  classStudents: Array<{
    id: string
    student: {
      id: string
      user: { name: string }
    }
  }>
}

interface Teacher {
  id: string
  userId: string
  subjects: string
  bio: string
  user: {
    id: string
    name: string
    email: string
    phone: string
  }
  availability: TeacherAvailability[]
  classes: TeacherClass[]
}

const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const weekdayFullNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

interface TeacherFormData {
  name: string
  email: string
  phone: string
  password: string
  subjects: string
  bio: string
}

const emptyForm: TeacherFormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  subjects: '',
  bio: '',
}

export default function ProfessoresPage() {
  const { authFetch } = useAppStore()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialogs
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [form, setForm] = useState<TeacherFormData>(emptyForm)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [saving, setSaving] = useState(false)

  const loadTeachers = useCallback(async () => {
    try {
      const res = await authFetch('/api/teachers')
      if (res.ok) {
        const data = await res.json()
        setTeachers(data)
      }
    } catch (err) {
      console.error('Erro ao carregar professores:', err)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    loadTeachers()
  }, [loadTeachers])

  const filteredTeachers = teachers.filter((t) => {
    const term = search.toLowerCase()
    return (
      t.user.name.toLowerCase().includes(term) ||
      t.user.email.toLowerCase().includes(term) ||
      t.subjects.toLowerCase().includes(term)
    )
  })

  // Get total students for a teacher
  const getTotalStudents = (teacher: Teacher) => {
    let total = 0
    teacher.classes.forEach((cls) => {
      total += cls.classStudents.length
    })
    return total
  }

  // Get class names for a teacher
  const getClassNames = (teacher: Teacher) => {
    return teacher.classes.map((c) => c.name).join(', ') || '—'
  }

  // Get subject list
  const getSubjects = (teacher: Teacher) => {
    if (!teacher.subjects) return '—'
    return teacher.subjects
  }

  // Availability summary
  const getAvailabilitySummary = (teacher: Teacher) => {
    if (!teacher.availability || teacher.availability.length === 0) return '—'
    const grouped: Record<number, TeacherAvailability[]> = {}
    teacher.availability.forEach((a) => {
      if (!grouped[a.weekday]) grouped[a.weekday] = []
      grouped[a.weekday].push(a)
    })
    return Object.entries(grouped)
      .map(([day, slots]) => {
        const times = slots.map((s) => `${s.startTime}-${s.endTime}`).join(', ')
        return `${weekdayNames[Number(day)]} ${times}`
      })
      .join(' | ')
  }

  // Upcoming classes count
  const getUpcomingCount = (teacher: Teacher) => {
    return teacher.classes.length
  }

  // CRUD handlers
  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }
    setSaving(true)
    try {
      const res = await authFetch('/api/teachers', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          subjects: form.subjects,
          bio: form.bio,
        }),
      })
      if (res.ok) {
        toast.success('Professor criado com sucesso!')
        setAddOpen(false)
        setForm(emptyForm)
        loadTeachers()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao criar professor.')
      }
    } catch {
      toast.error('Erro de conexão ao criar professor.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedTeacher || !form.name || !form.email) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }
    setSaving(true)
    try {
      const res = await authFetch(`/api/teachers/${selectedTeacher.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          subjects: form.subjects,
          bio: form.bio,
        }),
      })
      if (res.ok) {
        toast.success('Professor atualizado com sucesso!')
        setEditOpen(false)
        setSelectedTeacher(null)
        setForm(emptyForm)
        loadTeachers()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao atualizar professor.')
      }
    } catch {
      toast.error('Erro de conexão ao atualizar professor.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTeacher) return
    setSaving(true)
    try {
      const res = await authFetch(`/api/teachers/${selectedTeacher.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Professor excluído com sucesso!')
        setDeleteOpen(false)
        setSelectedTeacher(null)
        loadTeachers()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao excluir professor.')
      }
    } catch {
      toast.error('Erro de conexão ao excluir professor.')
    } finally {
      setSaving(false)
    }
  }

  const openEditDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setForm({
      name: teacher.user.name,
      email: teacher.user.email,
      phone: teacher.user.phone,
      password: '',
      subjects: teacher.subjects,
      bio: teacher.bio,
    })
    setEditOpen(true)
  }

  const openDeleteDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setDeleteOpen(true)
  }

  const openProfileDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setProfileOpen(true)
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-emerald-600" />
            Professores
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os professores da instituição
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
          Novo Professor
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou matéria..."
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
          ) : filteredTeachers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {search ? 'Nenhum professor encontrado para esta busca.' : 'Nenhum professor cadastrado ainda.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Matérias</TableHead>
                    <TableHead className="hidden lg:table-cell">Turmas</TableHead>
                    <TableHead className="hidden xl:table-cell">Qtd Alunos</TableHead>
                    <TableHead className="hidden xl:table-cell">Disponibilidade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">
                        {teacher.user.name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {teacher.user.email}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {teacher.subjects ? (
                          <div className="flex flex-wrap gap-1">
                            {teacher.subjects.split(',').map((s, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {s.trim()}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {getClassNames(teacher)}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {getTotalStudents(teacher)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                        {getAvailabilitySummary(teacher)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openProfileDialog(teacher)}
                            title="Ver Perfil"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(teacher)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(teacher)}
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
            <DialogTitle>Novo Professor</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo professor.
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
              <Label htmlFor="add-email">Email *</Label>
              <Input
                id="add-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@exemplo.com"
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
              <Label htmlFor="add-subjects">Matérias</Label>
              <Input
                id="add-subjects"
                value={form.subjects}
                onChange={(e) => setForm({ ...form, subjects: e.target.value })}
                placeholder="Ex: Matemática, Física (separadas por vírgula)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-bio">Biografia</Label>
              <Textarea
                id="add-bio"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Breve descrição do professor..."
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
              {saving ? 'Salvando...' : 'Criar Professor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Professor</DialogTitle>
            <DialogDescription>
              Atualize os dados do professor.
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
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              <Label htmlFor="edit-subjects">Matérias</Label>
              <Input
                id="edit-subjects"
                value={form.subjects}
                onChange={(e) => setForm({ ...form, subjects: e.target.value })}
                placeholder="Ex: Matemática, Física (separadas por vírgula)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-bio">Biografia</Label>
              <Textarea
                id="edit-bio"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
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
              Tem certeza que deseja excluir o professor{' '}
              <strong>{selectedTeacher?.user.name}</strong>? Esta ação não pode ser
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
              {saving ? 'Excluindo...' : 'Excluir Professor'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perfil do Professor</DialogTitle>
          </DialogHeader>
          {selectedTeacher && (
            <div className="space-y-6">
              {/* Teacher Info */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                  <GraduationCap className="h-8 w-8 text-emerald-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold">{selectedTeacher.user.name}</h3>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedTeacher.user.email}
                    </span>
                    {selectedTeacher.user.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedTeacher.user.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Subjects */}
              {selectedTeacher.subjects && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Matérias</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTeacher.subjects.split(',').map((s, i) => (
                      <Badge key={i} variant="secondary">
                        {s.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {selectedTeacher.bio && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Biografia</h4>
                  <p className="text-sm text-muted-foreground">{selectedTeacher.bio}</p>
                </div>
              )}

              {/* Availability */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Disponibilidade
                </h4>
                {selectedTeacher.availability && selectedTeacher.availability.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(
                      selectedTeacher.availability.reduce(
                        (acc, a) => {
                          if (!acc[a.weekday]) acc[a.weekday] = []
                          acc[a.weekday].push(a)
                          return acc
                        },
                        {} as Record<number, TeacherAvailability[]>
                      )
                    ).map(([day, slots]) => (
                      <div
                        key={day}
                        className="flex items-center gap-2 p-2 rounded-lg border bg-card"
                      >
                        <span className="font-medium text-sm min-w-[80px]">
                          {weekdayFullNames[Number(day)]}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {slots.map((s) => (
                            <Badge key={s.id} variant="outline" className="text-xs">
                              {s.startTime} - {s.endTime}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma disponibilidade cadastrada.
                  </p>
                )}
              </div>

              {/* Assigned Classes */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  Turmas Atribuídas
                </h4>
                {selectedTeacher.classes.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTeacher.classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div>
                          <p className="font-medium text-sm">{cls.name}</p>
                          <p className="text-xs text-muted-foreground">{cls.subject}</p>
                        </div>
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {cls.classStudents.length} alunos
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma turma atribuída.
                  </p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {getTotalStudents(selectedTeacher)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total de Alunos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {getUpcomingCount(selectedTeacher)}
                    </p>
                    <p className="text-xs text-muted-foreground">Turmas Ativas</p>
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
