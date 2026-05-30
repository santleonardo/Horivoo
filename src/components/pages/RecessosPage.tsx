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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'

interface Recess {
  id: string
  description: string
  startDate: string
  endDate: string
}

export default function RecessosPage() {
  const { authFetch } = useAppStore()
  const { toast } = useToast()

  const [recesses, setRecesses] = useState<Recess[]>([])
  const [loading, setLoading] = useState(true)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ description: '', startDate: '', endDate: '' })
  const [saving, setSaving] = useState(false)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editRecess, setEditRecess] = useState<Recess | null>(null)
  const [editForm, setEditForm] = useState({ description: '', startDate: '', endDate: '' })

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteRecess, setDeleteRecess] = useState<Recess | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchRecesses = useCallback(async () => {
    try {
      const res = await authFetch('/api/recesses')
      if (res.ok) {
        setRecesses(await res.json())
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar recessos.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [authFetch, toast])

  useEffect(() => {
    fetchRecesses()
  }, [fetchRecesses])

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate + 'T12:00:00')
    const end = new Date(endDate + 'T12:00:00')
    const diffMs = end.getTime() - start.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const isCurrentlyActive = (startDate: string, endDate: string) => {
    const today = new Date().toISOString().split('T')[0]
    return today >= startDate && today <= endDate
  }

  const isUpcoming = (startDate: string) => {
    const today = new Date().toISOString().split('T')[0]
    return startDate > today
  }

  const handleCreate = async () => {
    if (!createForm.startDate || !createForm.endDate) {
      toast({ title: 'Erro', description: 'Preencha as datas de início e fim.', variant: 'destructive' })
      return
    }
    if (createForm.startDate > createForm.endDate) {
      toast({ title: 'Erro', description: 'A data de início deve ser anterior à data de fim.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await authFetch('/api/recesses', {
        method: 'POST',
        body: JSON.stringify(createForm),
      })
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Recesso criado com sucesso!' })
        setCreateOpen(false)
        setCreateForm({ description: '', startDate: '', endDate: '' })
        fetchRecesses()
      } else {
        const data = await res.json()
        toast({ title: 'Erro', description: data.error || 'Falha ao criar recesso.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao criar recesso.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (recess: Recess) => {
    setEditRecess(recess)
    setEditForm({
      description: recess.description,
      startDate: recess.startDate,
      endDate: recess.endDate,
    })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editRecess) return
    if (!editForm.startDate || !editForm.endDate) {
      toast({ title: 'Erro', description: 'Preencha as datas de início e fim.', variant: 'destructive' })
      return
    }
    if (editForm.startDate > editForm.endDate) {
      toast({ title: 'Erro', description: 'A data de início deve ser anterior à data de fim.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await authFetch(`/api/recesses/${editRecess.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Recesso atualizado com sucesso!' })
        setEditOpen(false)
        setEditRecess(null)
        fetchRecesses()
      } else {
        const data = await res.json()
        toast({ title: 'Erro', description: data.error || 'Falha ao atualizar recesso.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao atualizar recesso.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteRecess) return
    setDeleting(true)
    try {
      const res = await authFetch(`/api/recesses/${deleteRecess.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Recesso excluído com sucesso!' })
        setDeleteOpen(false)
        setDeleteRecess(null)
        fetchRecesses()
      } else {
        const data = await res.json()
        toast({ title: 'Erro', description: data.error || 'Falha ao excluir recesso.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao excluir recesso.', variant: 'destructive' })
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
          <h2 className="text-2xl font-bold tracking-tight">Recessos</h2>
          <p className="text-muted-foreground">Gerencie os períodos de recesso.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Recesso
        </Button>
      </div>

      {recesses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum recesso cadastrado.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data Início</TableHead>
                    <TableHead>Data Fim</TableHead>
                    <TableHead className="text-center">Duração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recesses.map((recess) => {
                    const duration = calculateDuration(recess.startDate, recess.endDate)
                    const active = isCurrentlyActive(recess.startDate, recess.endDate)
                    const upcoming = isUpcoming(recess.startDate)

                    return (
                      <TableRow key={recess.id}>
                        <TableCell className="font-medium">
                          {recess.description || <span className="text-muted-foreground italic">Sem descrição</span>}
                        </TableCell>
                        <TableCell>{formatDate(recess.startDate)}</TableCell>
                        <TableCell>{formatDate(recess.endDate)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {duration} {duration === 1 ? 'dia' : 'dias'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {active ? (
                            <Badge variant="default">Em andamento</Badge>
                          ) : upcoming ? (
                            <Badge variant="outline">Próximo</Badge>
                          ) : (
                            <Badge variant="secondary">Encerrado</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(recess)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setDeleteRecess(recess); setDeleteOpen(true) }}
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
            <DialogTitle>Novo Recesso</DialogTitle>
            <DialogDescription>Cadastre um novo período de recesso.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-description">Descrição</Label>
              <Input
                id="create-description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Descrição do recesso (opcional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-start">Data Início</Label>
                <Input
                  id="create-start"
                  type="date"
                  value={createForm.startDate}
                  onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-end">Data Fim</Label>
                <Input
                  id="create-end"
                  type="date"
                  value={createForm.endDate}
                  onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                />
              </div>
            </div>
            {createForm.startDate && createForm.endDate && createForm.startDate <= createForm.endDate && (
              <p className="text-sm text-muted-foreground">
                Duração: {calculateDuration(createForm.startDate, createForm.endDate)}{' '}
                {calculateDuration(createForm.startDate, createForm.endDate) === 1 ? 'dia' : 'dias'}
              </p>
            )}
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
            <DialogTitle>Editar Recesso</DialogTitle>
            <DialogDescription>Altere os dados do recesso.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start">Data Início</Label>
                <Input
                  id="edit-start"
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">Data Fim</Label>
                <Input
                  id="edit-end"
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                />
              </div>
            </div>
            {editForm.startDate && editForm.endDate && editForm.startDate <= editForm.endDate && (
              <p className="text-sm text-muted-foreground">
                Duração: {calculateDuration(editForm.startDate, editForm.endDate)}{' '}
                {calculateDuration(editForm.startDate, editForm.endDate) === 1 ? 'dia' : 'dias'}
              </p>
            )}
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
            <AlertDialogTitle>Excluir Recesso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o recesso &quot;{deleteRecess?.description || formatDate(deleteRecess?.startDate || '')}&quot;? Esta ação não pode ser desfeita.
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
