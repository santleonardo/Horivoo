'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Loader2, Filter } from 'lucide-react'

interface ClassItem {
  id: string
  name: string
  subject: string
  teacher: { id: string; user: { name: string } }
}

interface TestItem {
  id: string
  classId: string
  title: string
  date: string
  class: { id: string; name: string; subject: string }
}

export default function ProvasPage() {
  const { authFetch } = useAppStore()
  const { toast } = useToast()

  const [tests, setTests] = useState<TestItem[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterClassId, setFilterClassId] = useState<string>('all')

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ classId: '', title: '', date: '' })
  const [saving, setSaving] = useState(false)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editTest, setEditTest] = useState<TestItem | null>(null)
  const [editForm, setEditForm] = useState({ classId: '', title: '', date: '' })

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTest, setDeleteTest] = useState<TestItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchTests = useCallback(async () => {
    try {
      const res = await authFetch('/api/tests')
      if (res.ok) {
        const data = await res.json()
        setTests(data)
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar provas.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [authFetch, toast])

  const fetchClasses = useCallback(async () => {
    try {
      const res = await authFetch('/api/classes')
      if (res.ok) {
        setClasses(await res.json())
      }
    } catch {
      // silent
    }
  }, [authFetch])

  useEffect(() => {
    fetchTests()
    fetchClasses()
  }, [fetchTests, fetchClasses])

  const handleCreate = async () => {
    if (!createForm.classId || !createForm.title || !createForm.date) {
      toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await authFetch('/api/tests', {
        method: 'POST',
        body: JSON.stringify(createForm),
      })
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Prova criada com sucesso!' })
        setCreateOpen(false)
        setCreateForm({ classId: '', title: '', date: '' })
        fetchTests()
      } else {
        const data = await res.json()
        toast({ title: 'Erro', description: data.error || 'Falha ao criar prova.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao criar prova.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (test: TestItem) => {
    setEditTest(test)
    setEditForm({ classId: test.classId, title: test.title, date: test.date })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editTest) return
    if (!editForm.classId || !editForm.title || !editForm.date) {
      toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await authFetch(`/api/tests/${editTest.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Prova atualizada com sucesso!' })
        setEditOpen(false)
        setEditTest(null)
        fetchTests()
      } else {
        const data = await res.json()
        toast({ title: 'Erro', description: data.error || 'Falha ao atualizar prova.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao atualizar prova.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTest) return
    setDeleting(true)
    try {
      const res = await authFetch(`/api/tests/${deleteTest.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Prova excluída com sucesso!' })
        setDeleteOpen(false)
        setDeleteTest(null)
        fetchTests()
      } else {
        const data = await res.json()
        toast({ title: 'Erro', description: data.error || 'Falha ao excluir prova.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao excluir prova.', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  const isPast = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0]
    return dateStr < today
  }

  const filteredTests = filterClassId === 'all'
    ? tests
    : tests.filter((t) => t.classId === filterClassId)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Provas</h2>
          <p className="text-muted-foreground">Gerencie o cronograma de provas.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Prova
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm whitespace-nowrap">Filtrar por turma:</Label>
        <Select value={filterClassId} onValueChange={setFilterClassId}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Todas as turmas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} — {c.subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredTests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhuma prova cadastrada.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turma</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell>
                        <Badge variant="secondary">{test.class.name}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{test.title}</TableCell>
                      <TableCell>
                        <span className={isPast(test.date) ? 'text-muted-foreground' : ''}>
                          {formatDate(test.date)}
                        </span>
                        {isPast(test.date) && (
                          <Badge variant="outline" className="ml-2 text-xs">Realizada</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(test)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setDeleteTest(test); setDeleteOpen(true) }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
            <DialogTitle>Nova Prova</DialogTitle>
            <DialogDescription>Agende uma nova prova.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-class">Turma</Label>
              <Select
                value={createForm.classId}
                onValueChange={(v) => setCreateForm({ ...createForm, classId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-title">Título</Label>
              <Input
                id="create-title"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="Título da prova"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-date">Data</Label>
              <Input
                id="create-date"
                type="date"
                value={createForm.date}
                onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
              />
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
            <DialogTitle>Editar Prova</DialogTitle>
            <DialogDescription>Altere os dados da prova.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-class">Turma</Label>
              <Select
                value={editForm.classId}
                onValueChange={(v) => setEditForm({ ...editForm, classId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title">Título</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date">Data</Label>
              <Input
                id="edit-date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              />
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
            <AlertDialogTitle>Excluir Prova</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a prova &quot;{deleteTest?.title}&quot;? Esta ação não pode ser desfeita.
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
    </div>
  )
}
