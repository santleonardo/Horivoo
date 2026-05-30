'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Mail,
  Send,
  Inbox,
  Pencil,
  Clock,
  User,
  Circle,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface Message {
  id: string
  senderId: string
  receiverId: string
  subject: string
  body: string
  read: boolean
  createdAt: string
  sender: { id: string; name: string; email: string; role: string }
  receiver: { id: string; name: string; email: string; role: string }
}

interface Contact {
  id: string
  name: string
  email: string
  phone: string
  role: string
  teacher?: { id: string } | null
  student?: { id: string } | null
}

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const roleLabel: Record<string, string> = {
  coordinator: 'Coordenador',
  teacher: 'Professor',
  student: 'Aluno',
}

const roleColors: Record<string, string> = {
  coordinator: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  teacher: 'bg-amber-100 text-amber-700 border-amber-200',
  student: 'bg-sky-100 text-sky-700 border-sky-200',
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function MessagesPage() {
  const { user, authFetch } = useAppStore()

  const [inboxMessages, setInboxMessages] = useState<Message[]>([])
  const [sentMessages, setSentMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Message | null>(null)
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox')

  // Compose dialog
  const [composeOpen, setComposeOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [toId, setToId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)

  /* ---- Load messages ---- */
  const loadMessages = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [inboxRes, sentRes] = await Promise.all([
        authFetch('/api/messages?box=inbox'),
        authFetch('/api/messages?box=sent'),
      ])

      if (inboxRes.ok) {
        const data = await inboxRes.json()
        setInboxMessages(Array.isArray(data) ? data : [])
      }
      if (sentRes.ok) {
        const data = await sentRes.json()
        setSentMessages(Array.isArray(data) ? data : [])
      }
    } catch {
      toast.error('Erro ao carregar mensagens')
    } finally {
      setLoading(false)
    }
  }, [user, authFetch])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  /* ---- Unread count ---- */
  const unreadCount = inboxMessages.filter(m => !m.read).length

  /* ---- Current messages based on tab ---- */
  const currentMessages = activeTab === 'inbox' ? inboxMessages : sentMessages

  /* ---- Load contacts for compose ---- */
  const openCompose = async () => {
    setLoadingContacts(true)
    try {
      const res = await authFetch('/api/users')
      if (!res.ok) throw new Error('Erro ao carregar contatos')
      const data = await res.json()
      const allContacts: Contact[] = Array.isArray(data) ? data : []

      // Filter contacts based on role
      let filtered: Contact[] = []
      if (user?.role === 'coordinator') {
        // Coordinator can message anyone
        filtered = allContacts.filter(c => c.id !== user.id)
      } else if (user?.role === 'teacher') {
        // Teacher can message their students and coordinators
        filtered = allContacts.filter(c =>
          c.id !== user.id && (c.role === 'coordinator' || c.role === 'student')
        )
      } else if (user?.role === 'student') {
        // Student can message their teachers and coordinators
        filtered = allContacts.filter(c =>
          c.id !== user.id && (c.role === 'coordinator' || c.role === 'teacher')
        )
      }

      setContacts(filtered)
      setToId('')
      setSubject('')
      setBody('')
      setComposeOpen(true)
    } catch {
      toast.error('Erro ao carregar contatos')
    } finally {
      setLoadingContacts(false)
    }
  }

  /* ---- Mark as read ---- */
  const markRead = async (msg: Message) => {
    setSelected(msg)
    if (!msg.read && activeTab === 'inbox') {
      try {
        await authFetch(`/api/messages/${msg.id}/read`, {
          method: 'PATCH',
        })
        setInboxMessages(prev =>
          prev.map(m => m.id === msg.id ? { ...m, read: true } : m)
        )
      } catch {
        // Silently fail - still show the message
      }
    }
  }

  /* ---- Send message ---- */
  const sendMessage = async () => {
    if (!toId || !body.trim()) {
      toast.error('Selecione o destinatário e escreva a mensagem')
      return
    }
    setSending(true)
    try {
      const res = await authFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverId: toId, subject, body: body.trim() }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Erro ao enviar' }))
        throw new Error(errData.error || 'Erro ao enviar')
      }
      toast.success('Mensagem enviada!')
      setComposeOpen(false)
      await loadMessages()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  /* ---- Reply helper ---- */
  const replyTo = async (msg: Message) => {
    setLoadingContacts(true)
    try {
      const res = await authFetch('/api/users')
      if (!res.ok) throw new Error()
      const data = await res.json()
      const allContacts: Contact[] = Array.isArray(data) ? data : []

      // Filter similarly
      let filtered: Contact[] = []
      if (user?.role === 'coordinator') {
        filtered = allContacts.filter(c => c.id !== user.id)
      } else if (user?.role === 'teacher') {
        filtered = allContacts.filter(c =>
          c.id !== user.id && (c.role === 'coordinator' || c.role === 'student')
        )
      } else if (user?.role === 'student') {
        filtered = allContacts.filter(c =>
          c.id !== user.id && (c.role === 'coordinator' || c.role === 'teacher')
        )
      }

      setContacts(filtered)
      const otherId = msg.senderId === user?.id ? msg.receiverId : msg.senderId
      const otherName = msg.senderId === user?.id ? msg.receiver.name : msg.sender.name
      setToId(otherId)
      setSubject(`Re: ${msg.subject || '(sem assunto)'}`)
      setBody(`\n\n--- Mensagem original de ${otherName} ---\n${msg.body}`)
      setComposeOpen(true)
    } catch {
      toast.error('Erro ao carregar contatos')
    } finally {
      setLoadingContacts(false)
    }
  }

  /* ---- Format date ---- */
  const formatMsgDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr)
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const hours = String(d.getHours()).padStart(2, '0')
      const mins = String(d.getMinutes()).padStart(2, '0')
      return `${day}/${month} ${hours}:${mins}`
    } catch {
      return dateStr
    }
  }

  const formatFullDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr)
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      const hours = String(d.getHours()).padStart(2, '0')
      const mins = String(d.getMinutes()).padStart(2, '0')
      return `${day}/${month}/${year} às ${hours}:${mins}`
    } catch {
      return dateStr
    }
  }

  /* ---- Render message list item ---- */
  const renderMessageItem = (msg: Message) => {
    const other = activeTab === 'inbox' ? msg.sender : msg.receiver
    const isSelected = selected?.id === msg.id
    const isUnread = !msg.read && activeTab === 'inbox'

    return (
      <button
        key={msg.id}
        onClick={() => markRead(msg)}
        className={`w-full text-left p-3 transition-colors hover:bg-muted/50 ${
          isSelected ? 'bg-emerald-50 border-l-2 border-emerald-500' : 'border-l-2 border-transparent'
        }`}
      >
        <div className="flex items-start gap-2">
          {isUnread && (
            <Circle className="size-2 mt-1.5 fill-emerald-500 text-emerald-500 shrink-0" />
          )}
          {!isUnread && <div className="size-2 mt-1.5 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                {other.name}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatMsgDate(msg.createdAt)}
              </span>
            </div>
            <p className={`text-xs truncate ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
              {msg.subject || '(sem assunto)'}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {msg.body}
            </p>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mensagens</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo lido'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadMessages} disabled={loading}>
            <RefreshCw className={`size-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={openCompose} className="bg-emerald-600 hover:bg-emerald-700">
            <Pencil className="size-4 mr-1" />
            Nova Mensagem
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: 'calc(100vh - 220px)' }}>
        {/* Sidebar: message list */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'inbox' | 'sent'); setSelected(null) }}>
            <TabsList className="w-full">
              <TabsTrigger value="inbox" className="flex-1 gap-1.5">
                <Inbox className="size-4" />
                Caixa de Entrada
                {unreadCount > 0 && (
                  <Badge className="h-5 px-1.5 text-xs bg-emerald-600 text-white">{unreadCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex-1 gap-1.5">
                <Send className="size-4" />
                Enviadas
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Message list */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0 h-full overflow-y-auto max-h-[calc(100vh-320px)]">
              {loading ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mr-2" />
                  Carregando...
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                  <Mail className="size-10 opacity-30" />
                  <p className="text-sm">Nenhuma mensagem</p>
                </div>
              ) : (
                <div className="divide-y">
                  {currentMessages.map(renderMessageItem)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main: message detail */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            {selected ? (
              <div className="flex flex-col h-full">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold line-clamp-1">
                        {selected.subject || '(sem assunto)'}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="size-3.5" />
                          <strong>De:</strong> {selected.sender.name}
                          <Badge variant="outline" className={`text-xs ml-1 ${roleColors[selected.sender.role] || ''}`}>
                            {roleLabel[selected.sender.role] || selected.sender.role}
                          </Badge>
                        </span>
                        <span className="flex items-center gap-1">
                          <strong>Para:</strong> {selected.receiver.name}
                          <Badge variant="outline" className={`text-xs ml-1 ${roleColors[selected.receiver.role] || ''}`}>
                            {roleLabel[selected.receiver.role] || selected.receiver.role}
                          </Badge>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {formatFullDate(selected.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => replyTo(selected)}
                    >
                      <Send className="size-3.5 mr-1" />
                      Responder
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto pt-4 max-h-[calc(100vh-380px)]">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {selected.body}
                  </p>
                </CardContent>
              </div>
            ) : (
              <CardContent className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 min-h-[300px]">
                <Mail className="size-16 opacity-20" />
                <p className="text-sm">Selecione uma mensagem para visualizar</p>
                <Button variant="outline" size="sm" onClick={openCompose}>
                  <Pencil className="size-4 mr-1" />
                  Nova Mensagem
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Mensagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Para</Label>
              <Select value={toId} onValueChange={setToId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o destinatário..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.length === 0 && !loadingContacts && (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                      Nenhum contato disponível
                    </div>
                  )}
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        {c.name}
                        <Badge variant="outline" className={`text-[10px] px-1 py-0 h-3.5 ${roleColors[c.role] || ''}`}>
                          {roleLabel[c.role] || c.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Assunto</Label>
              <Input
                placeholder="Assunto (opcional)"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Mensagem</Label>
              <Textarea
                placeholder="Escreva sua mensagem aqui..."
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>
          </div>
          <Separator />
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={sendMessage}
              disabled={sending || !toId || !body.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {sending ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="size-4 mr-1" />
                  Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
