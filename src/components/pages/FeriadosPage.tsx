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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'

interface Holiday {
  id: string
  name: string
  date: string
}

export default function FeriadosPage() {
  const { authFetch } = useAppStore()
  const { toast } = useToast()

  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', date: '' })
  const [saving, setSaving] = useState(false)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null)
  const [editForm, setEditForm] = useState({ name: '', date: '' })

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteHoliday, setDeleteHoliday] = useState<Holiday | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchHolidays = useCallback(async () => {
    try {
      const res = await authFetch('/api/holidays')
      if (res.ok) {
        setHolidays(await res.json())
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar feriados.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [authFetch, toast])

  useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  const getWeekday = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    return weekdays[date.getDay()]
  }

  const handleCreate = async () => {
    if (!createForm.name || !createForm.date) {
      toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await authFetch('/api/holidays', {
        method: 'POST',
        body: JSON.stringify(createForm),
      })
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Feriado criado com sucesso!' })
        setCreateOpen(false)
        setCreateForm({ name: '', date: '' })
        fetchHolidays()
      } else {
        const data = await res.json()
        toast({ title: 'Erro', description: data.error || 'Falha ao criar feriado.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao criar feriado.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (holiday: Holiday) => {
    setEditHoliday(holiday)
    setEditForm({ name: holiday.name, date: holiday.date })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editHoliday) return
    if (!editForm.name || !editForm.date) {
      toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await authFetch(`/api/holidays/${editHoliday.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Feriado atualizado com sucesso!' })
        setEditOpen(false)
        setEditHoliday(null)
        fetchHolidays()
      } else {
        const data = await res.json()
        toast({ title: 'Erro', description: data.error || 'Falha ao atualizar feriado.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao atualizar feriado.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteHoliday) return
    setDeleting(true)
    try {
      const res = await authFetch(`/api/holidays/${deleteHoliday.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Feriado excluído com sucesso!' })
        setDeleteOpen(false)
        setDeleteHoliday(null)
        fetchHolidays()
      } else {
        const data = await res.json()
        toast({ title: 'Erro', description: data.error || 'Falha ao excluir feriado.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao excluir feriado.', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

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
          <h2 className="text-2xl font-bold tracking-tight">Feriados</h2>
          <p className="text-muted-foreground">Gerencie os feriados do sistema.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Feriado
        </Button>
      </div>

      {holidays.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum feriado cadastrado.</p>
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
                    <TableHead>Data</TableHead>
                    <TableHead>Dia da Semana</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-medium">{holiday.name}</TableCell>
                      <TableCell>{formatDate(holiday.date)}</TableCell>
                      <TableCell className="text-muted-foreground">{getWeekday(holiday.date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(holiday)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setDeleteHoliday(holiday); setDeleteOpen(true) }}
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
            <DialogTitle>Novo Feriado</DialogTitle>
            <DialogDescription>Cadastre um novo feriado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Nome do feriado"
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
            <DialogTitle>Editar Feriado</DialogTitle>
            <DialogDescription>Altere os dados do feriado.</DialogDescription>
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
            <AlertDialogTitle>Excluir Feriado</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o feriado &quot;{deleteHoliday?.name}&quot;? Esta ação não pode ser desfeita.
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
