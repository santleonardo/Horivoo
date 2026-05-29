'use client';

/**
 * MessagesPage.tsx
 * Sistema de mensagens internas para todos os papéis.
 * Coordenador ↔ Professores ↔ Alunos
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, authFetch } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail,
  Send,
  Inbox,
  Pencil,
  Clock,
  User,
  Circle,
  RefreshCw,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  subject: string;
  body: string;
  read: boolean;
  created_at: string;
  sender:   { name: string; email: string; role: string };
  receiver: { name: string; email: string; role: string };
}

interface Contact {
  id: string;
  name: string;
  email: string;
  role: string;
}

const roleLabel: Record<string, string> = {
  coordinator: 'Coordenador',
  teacher:     'Professor',
  student:     'Aluno',
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function MessagesPage() {
  const { user } = useAuthStore();

  const [box, setBox]         = useState<'inbox' | 'sent'>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);

  // Compose dialog
  const [composeOpen, setComposeOpen] = useState(false);
  const [contacts, setContacts]       = useState<Contact[]>([]);
  const [toId, setToId]               = useState('');
  const [subject, setSubject]         = useState('');
  const [body, setBody]               = useState('');
  const [sending, setSending]         = useState(false);

  /* ---- Load messages ---- */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await authFetch(`/api/messages?box=${box}`);
      const data = await res.json();
      setMessages(data.messages || []);
      setUnread(data.unread || 0);
    } catch {
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  }, [box]);

  useEffect(() => { load(); }, [load]);

  /* ---- Load contacts for compose ---- */
  const openCompose = async () => {
    try {
      const res  = await authFetch('/api/users');
      const data = await res.json();
      setContacts(data.users || []);
      setToId('');
      setSubject('');
      setBody('');
      setComposeOpen(true);
    } catch {
      toast.error('Erro ao carregar contatos');
    }
  };

  /* ---- Mark as read ---- */
  const markRead = async (msg: Message) => {
    setSelected(msg);
    if (!msg.read && box === 'inbox') {
      await authFetch('/api/messages/read', {
        method: 'PATCH',
        body: JSON.stringify({ messageId: msg.id }),
      });
      setMessages(prev =>
        prev.map(m => m.id === msg.id ? { ...m, read: true } : m)
      );
      setUnread(prev => Math.max(0, prev - 1));
    }
  };

  /* ---- Send message ---- */
  const send = async () => {
    if (!toId || !body.trim()) {
      toast.error('Selecione o destinatário e escreva a mensagem');
      return;
    }
    setSending(true);
    try {
      const res = await authFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: toId, subject, body }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao enviar');
      }
      toast.success('Mensagem enviada!');
      setComposeOpen(false);
      if (box === 'sent') load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  /* ---- Reply helper ---- */
  const reply = async (msg: Message) => {
    const res  = await authFetch('/api/users');
    const data = await res.json();
    setContacts(data.users || []);
    const otherId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
    const otherName = msg.sender_id === user?.id ? msg.receiver.name : msg.sender.name;
    setToId(otherId);
    setSubject(`Re: ${msg.subject || '(sem assunto)'}`);
    setBody(`\n\n--- Mensagem original de ${otherName} ---\n${msg.body}`);
    setComposeOpen(true);
  };

  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mensagens</h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo lido'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`size-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={openCompose} className="bg-emerald-600 hover:bg-emerald-700">
            <Pencil className="size-4 mr-1" />
            Nova Mensagem
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Sidebar: list */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          {/* Tab switch */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => { setBox('inbox'); setSelected(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-1.5 rounded-md transition-colors ${
                box === 'inbox'
                  ? 'bg-white shadow-sm text-emerald-700'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Inbox className="size-4" />
              Recebidas
              {unread > 0 && (
                <Badge className="h-5 px-1.5 text-xs bg-emerald-600">{unread}</Badge>
              )}
            </button>
            <button
              onClick={() => { setBox('sent'); setSelected(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-1.5 rounded-md transition-colors ${
                box === 'sent'
                  ? 'bg-white shadow-sm text-emerald-700'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Send className="size-4" />
              Enviadas
            </button>
          </div>

          {/* Message list */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0 h-full overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  <RefreshCw className="size-5 animate-spin mr-2" />
                  Carregando...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                  <Mail className="size-10 opacity-30" />
                  <p className="text-sm">Nenhuma mensagem</p>
                </div>
              ) : (
                <div className="divide-y">
                  {messages.map(msg => {
                    const other = box === 'inbox' ? msg.sender : msg.receiver;
                    const isSelected = selected?.id === msg.id;
                    const isUnread   = !msg.read && box === 'inbox';
                    return (
                      <button
                        key={msg.id}
                        onClick={() => markRead(msg)}
                        className={`w-full text-left p-3 transition-colors hover:bg-muted/50 ${
                          isSelected ? 'bg-emerald-50 border-l-2 border-emerald-500' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {isUnread && (
                            <Circle className="size-2 mt-1.5 fill-emerald-500 text-emerald-500 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                                {other.name}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {format(parseISO(msg.created_at), "dd/MM HH:mm")}
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
                    );
                  })}
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
                          <Badge variant="outline" className="text-xs ml-1">
                            {roleLabel[selected.sender.role] || selected.sender.role}
                          </Badge>
                        </span>
                        <span className="flex items-center gap-1">
                          <strong>Para:</strong> {selected.receiver.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {format(parseISO(selected.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reply(selected)}
                    >
                      <Send className="size-3.5 mr-1" />
                      Responder
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto pt-4">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {selected.body}
                  </p>
                </CardContent>
              </div>
            ) : (
              <CardContent className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
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
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({roleLabel[c.role] || c.role})
                      </span>
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
              onClick={send}
              disabled={sending || !toId || !body.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {sending ? 'Enviando...' : (
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
  );
}
