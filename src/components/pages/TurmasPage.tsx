'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Users, Search, X, Loader2 } from 'lucide-react'

interface Teacher {
  id: string
  userId: string
  user: { id: string; name: string; email: string }
}

interface ClassStudent {
  id: string
  studentId: string
  student: {
    id: string
    user: { id: string; name: string; email: string }
  }
}

interface Appointment {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
}

interface ClassItem {
  id: string
  name: string
  subject: string
  teacherId: string
  teacher: { id: string; user: { name: string } }
  classStudents: ClassStudent[]
  appointments: Appointment[]
  appointmentsCount: number
}

interface StudentItem {
  id: string
  userId: string
  user: { id: string; name: string; email: string }
}

export default function TurmasPage() {
  const { authFetch } = useAppStore()
  const { toast } = useToast()

  const [classes, setClasses] = useState<ClassItem[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [allStudents, setAllStudents] = useState<StudentItem[]>([])
  const [loading, setLoading] = useState(true)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', subject: '', teacherId: '' })
  const [saving, setSaving] = useState(false)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editClass, setEditClass] = useState<ClassItem | null>(null)
  const [editForm, setEditForm] = useState({ name: '', subject: '', teacherId: '' })

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteClass, setDeleteClass] = useState<ClassItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Manage students dialog
  const [manageOpen, setManageOpen] = useState(false)
  const [manageClass, setManageClass] = useState<ClassItem | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [addingStudents, setAddingStudents] = useState(false)
  const [removingStudent, setRemovingStudent] = useState<string | null>(null)

  const fetchClasses = useCallback(async () => {
    try {
      const res = await authFetch('/api/classes')
      if (res.ok) {
        const data = await res.json()
        setClasses(data)
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar turmas.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [authFetch, toast])

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await authFetch('/api/teachers')
      if (res.ok) {
        const data = await res.json()
        setTeachers(data)
      }
    } catch {
      // silent
    }
  }, [authFetch])

  const fetchAllStudents = useCallback(async () => {
    try {
      const res = await authFetch('/api/students')
      if (res.ok) {
        const data = await res.json()
        setAllStudents(data)
      }
    } catch {
      // silent
    }
  }, [authFetch])

  useEffect(() => {
    fetchClasses()
    fetchTeachers()
    fetchAllStudents()
  }, [fetchClasses, fetchTeachers, fetchAllStudents])

  // Create class
  const handleCreate = async () => {
    if (!createForm.name || !createForm.subject || !createForm.teacherId) {
      toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await authFetch('/api/classes', {
        method: 'POST',
        body: JSON.stringify(createForm),
      })
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Turma criada com sucesso!' })
        setCreateOpen(false)
        setCreateForm({ name: '', subject: '', teacherId: '' })
        fetchClasses()
      } else {
        const data = await res.json()
        toast({ title: 'Erro', description: data.error || 'Falha ao criar turma.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao criar turma.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Edit class
  const openEdit = (cls: ClassItem) => {
    setEditClass(cls)
    setEditForm({ name: cls.name, subject: cls.subject, teacherId: cls.teacherId })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editClass) return
    if (!editForm.name || !editForm.subject || !editForm.teacherId) {
      toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await authFetch(`/api/classes/${editClass.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Turma atualizada com sucesso!' })
        setEditOpen(false)
        setEditClass(null)
        fetchClasses()
      } else {
        const data = await res.json()
        toast({ title: 'Erro', description: data.error || 'Falha ao atualizar turma.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao atualizar turma.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Delete class
  const handleDelete = async () => {
    if (!deleteClass) return
    setDeleting(true)
    try {
      const res = await authFetch(`/api/classes/${deleteClass.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Turma excluída com sucesso!' })
        setDeleteOpen(false)
        setDeleteClass(null)
        fetchClasses()
      } else {
        const data = await res.json()
        toast({ title: 'Erro', description: data.error || 'Falha ao excluir turma.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao excluir turma.', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  // Manage students
  const openManage = (cls: ClassItem) => {
    setManageClass(cls)
    setStudentSearch('')
    setManageOpen(true)
  }

  const addStudents = async (studentIds: string[]) => {
    if (!manageClass || studentIds.length === 0) return
    setAddingStudents(true)
    try {
      const res = await authFetch(`/api/classes/${manageClass.id}/students`, {
        method: 'POST',
        body: JSON.stringify({ studentIds }),
      })
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Aluno(s) adicionado(s) com sucesso!' })
        fetchClasses()
        // Refresh manageClass
        const updated = await (await authFetch('/api/classes')).json()
        const found = updated.find((c: ClassItem) => c.id === manageClass.id)
        if (found) setManageClass(found)
        setClasses(updated)
      } else {
        const data = await res.json()
        toast({ title: 'Erro', description: data.error || 'Falha ao adicionar alunos.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao adicionar alunos.', variant: 'destructive' })
    } finally {
      setAddingStudents(false)
    }
  }

  const removeStudent = async (studentId: string) => {
    if (!manageClass) return
    setRemovingStudent(studentId)
    try {
      const res = await authFetch(`/api/classes/${manageClass.id}/students`, {
        method: 'DELETE',
        body: JSON.stringify({ studentId }),
      })
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Aluno removido da turma.' })
        fetchClasses()
        // Refresh manageClass
        const updated = await (await authFetch('/api/classes')).json()
        const found = updated.find((c: ClassItem) => c.id === manageClass.id)
        if (found) setManageClass(found)
        setClasses(updated)
      } else {
        const data = await res.json()
        toast({ title: 'Erro', description: data.error || 'Falha ao remover aluno.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao remover aluno.', variant: 'destructive' })
    } finally {
      setRemovingStudent(null)
    }
  }

  const getNextAppointments = (appointments: Appointment[]) => {
    const today = new Date().toISOString().split('T')[0]
    const upcoming = appointments
      .filter((a) => a.date >= today && a.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .slice(0, 3)
    return upcoming
  }

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  // Get students not in current class for the search
  const currentStudentIds = new Set(manageClass?.classStudents.map((cs) => cs.studentId) || [])
  const availableStudents = allStudents.filter((s) => !currentStudentIds.has(s.id))
  const filteredStudents = studentSearch
    ? availableStudents.filter((s) =>
        s.user.name.toLowerCase().includes(studentSearch.toLowerCase())
      )
    : availableStudents

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Turmas</h2>
          <p className="text-muted-foreground">Gerencie as turmas do sistema.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Turma
        </Button>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhuma turma cadastrada.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Matéria</TableHead>
                    <TableHead>Professor</TableHead>
                    <TableHead className="text-center">Qtd Alunos</TableHead>
                    <TableHead>Próximas Aulas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => {
                    const next = getNextAppointments(cls.appointments)
                    return (
                      <TableRow key={cls.id}>
                        <TableCell className="font-medium">{cls.name}</TableCell>
                        <TableCell>{cls.subject}</TableCell>
                        <TableCell>{cls.teacher.user.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{cls.classStudents.length}</Badge>
                        </TableCell>
                        <TableCell>
                          {next.length > 0 ? (
                            <div className="space-y-1">
                              {next.map((a) => (
                                <div key={a.id} className="text-xs text-muted-foreground">
                                  {formatDate(a.date)} {a.startTime}-{a.endTime}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Nenhuma aula agendada</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openManage(cls)}
                              title="Gerenciar Alunos"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(cls)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setDeleteClass(cls); setDeleteOpen(true) }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Turma</DialogTitle>
            <DialogDescription>Preencha os dados para criar uma nova turma.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Nome da turma"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-subject">Matéria</Label>
              <Input
                id="create-subject"
                value={createForm.subject}
                onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                placeholder="Matéria"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-teacher">Professor</Label>
              <Select
                value={createForm.teacherId}
                onValueChange={(v) => setCreateForm({ ...createForm, teacherId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o professor" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Turma</DialogTitle>
            <DialogDescription>Altere os dados da turma.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subject">Matéria</Label>
              <Input
                id="edit-subject"
                value={editForm.subject}
                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-teacher">Professor</Label>
              <Select
                value={editForm.teacherId}
                onValueChange={(v) => setEditForm({ ...editForm, teacherId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o professor" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Turma</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a turma &quot;{deleteClass?.name}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Students Dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerenciar Alunos — {manageClass?.name}</DialogTitle>
            <DialogDescription>Adicione ou remova alunos desta turma.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current students */}
            <div>
              <Label className="text-sm font-medium">Alunos na turma ({manageClass?.classStudents.length || 0})</Label>
              <ScrollArea className="max-h-48 mt-2">
                {manageClass && manageClass.classStudents.length > 0 ? (
                  <div className="space-y-2 pr-2">
                    {manageClass.classStudents.map((cs) => (
                      <div
                        key={cs.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <span className="text-sm">{cs.student.user.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStudent(cs.studentId)}
                          disabled={removingStudent === cs.studentId}
                        >
                          {removingStudent === cs.studentId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">Nenhum aluno nesta turma.</p>
                )}
              </ScrollArea>
            </div>

            {/* Search and add students */}
            <div>
              <Label className="text-sm font-medium">Adicionar alunos</Label>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar aluno..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="max-h-48 mt-2">
                {filteredStudents.length > 0 ? (
                  <div className="space-y-1 pr-2">
                    {filteredStudents.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-accent/50"
                      >
                        <span className="text-sm">{s.user.name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addStudents([s.id])}
                          disabled={addingStudents}
                        >
                          {addingStudents ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Adicionar'}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    {studentSearch ? 'Nenhum aluno encontrado.' : 'Todos os alunos já estão na turma.'}
                  </p>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
