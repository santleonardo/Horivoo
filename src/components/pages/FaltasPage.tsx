'use client';

/**
 * FaltasPage.tsx — Controle de presença/faltas.
 * Coordenador: marcar presença para qualquer turma, ver histórico
 * Professor: marcar presença para suas turmas, ver histórico
 * Aluno: ver próprio histórico de faltas com estatísticas
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, authFetch } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Users,
  Calendar,
  BarChart3,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ------------------------------------------------------------------ */

interface AttendanceRecord {
  id: string;
  date: string;
  studentId: string;
  studentName: string;
  status: 'present' | 'absent' | 'justified';
  classId: string;
  className: string;
  notes?: string;
}

interface Turma {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  students?: { id: string; name: string; email: string }[];
}

interface Student {
  id: string;
  name: string;
  email: string;
}

/* ------------------------------------------------------------------ */

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  present:   { label: 'Presente',    color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  absent:    { label: 'Ausente',     color: 'bg-red-100 text-red-700',         icon: XCircle },
  justified: { label: 'Justificado', color: 'bg-amber-100 text-amber-700',     icon: AlertCircle },
};

/* ------------------------------------------------------------------ */

export function FaltasPage() {
  const { user } = useAuthStore();
  const isCoordinator = user?.role === 'coordinator';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Attendance records
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Mark attendance
  const [markingOpen, setMarkingOpen] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent' | 'justified'>>({});
  const [submitting, setSubmitting] = useState(false);

  // Student view
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);

  /* ---- Load turmas ---- */
  const loadTurmas = useCallback(async () => {
    try {
      const res = await authFetch('/api/classes');
      const data = await res.json();
      setTurmas(data.classes || []);
    } catch {
      toast.error('Erro ao carregar turmas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTurmas(); }, [loadTurmas]);

  /* ---- Load attendance for selected class ---- */
  useEffect(() => {
    if (!selectedClassId) return;
    setRecordsLoading(true);
    authFetch(`/api/attendance?classId=${selectedClassId}`)
      .then(r => r.json())
      .then(data => setRecords(data.attendance || []))
      .catch(() => setRecords([]))
      .finally(() => setRecordsLoading(false));
  }, [selectedClassId]);

  /* ---- Student: load own attendance ---- */
  useEffect(() => {
    if (!isStudent || !user) return;
    authFetch(`/api/attendance?studentId=${user.id}`)
      .then(r => r.json())
      .then(data => setStudentRecords(data.attendance || []))
      .catch(() => setStudentRecords([]));
  }, [isStudent, user]);

  /* ---- Open marking dialog ---- */
  const openMarking = async () => {
    if (!selectedClassId) {
      toast.error('Selecione uma turma');
      return;
    }

    // Load students for this class
    try {
      const res = await authFetch(`/api/classes/${selectedClassId}/students`);
      const data = await res.json();
      const students: Student[] = data.students || [];

      // Initialize attendance map
      const map: Record<string, 'present' | 'absent' | 'justified'> = {};
      students.forEach(s => { map[s.id] = 'present'; });

      // Load existing records for this class+date
      const aRes = await authFetch(`/api/attendance?classId=${selectedClassId}&date=${selectedDate}`);
      const aData = await aRes.json();
      (aData.attendance || []).forEach((r: AttendanceRecord) => {
        map[r.studentId] = r.status;
      });

      setAttendanceMap(map);
      setMarkingOpen(true);
    } catch {
      toast.error('Erro ao carregar alunos');
    }
  };

  /* ---- Save attendance ---- */
  const handleSaveAttendance = async () => {
    setSubmitting(true);
    try {
      const entries = Object.entries(attendanceMap).map(([studentId, status]) => ({
        studentId,
        status,
        date: selectedDate,
        classId: selectedClassId,
      }));

      const res = await authFetch('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({ attendance: entries }),
      });
      if (!res.ok) throw new Error();
      toast.success('Presença registrada com sucesso');
      setMarkingOpen(false);
      // Reload
      authFetch(`/api/attendance?classId=${selectedClassId}`)
        .then(r => r.json())
        .then(data => setRecords(data.attendance || []));
    } catch {
      toast.error('Erro ao registrar presença');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- Student stats ---- */
  const studentStats = isStudent ? {
    total: studentRecords.length,
    present: studentRecords.filter(r => r.status === 'present').length,
    absent: studentRecords.filter(r => r.status === 'absent').length,
    justified: studentRecords.filter(r => r.status === 'justified').length,
  } : null;

  /* ---- Render ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-60 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" />
        Carregando...
      </div>
    );
  }

  /* ── Student View ── */
  if (isStudent) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Faltas</h1>
          <p className="text-sm text-muted-foreground">Histórico de presença e ausências</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-gray-100">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{studentStats?.total || 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-100">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{studentStats?.present || 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Presentes</p>
            </CardContent>
          </Card>
          <Card className="border-red-100">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{studentStats?.absent || 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Faltas</p>
            </CardContent>
          </Card>
          <Card className="border-amber-100">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{studentStats?.justified || 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Justificadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance rate */}
        {studentStats && studentStats.total > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Frequência</span>
                <span className="text-sm font-bold text-emerald-600">
                  {Math.round((studentStats.present / studentStats.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-emerald-500 rounded-full h-3 transition-all"
                  style={{ width: `${(studentStats.present / studentStats.total) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="size-4" />
              Histórico de Presença
            </CardTitle>
          </CardHeader>
          <CardContent>
            {studentRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum registro de presença encontrado
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {studentRecords.map(r => {
                  const cfg = statusConfig[r.status] || statusConfig.present;
                  const Icon = cfg.icon;
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                      <Icon className={`size-4 shrink-0 ${cfg.color.split(' ')[1]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {format(parseISO(r.date), "dd 'de' MMM", { locale: ptBR })}
                          </span>
                          <Badge variant="outline" className="text-xs">{r.className}</Badge>
                        </div>
                      </div>
                      <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Coordinator / Teacher View ── */
  const canMark = isCoordinator || isTeacher;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Faltas</h1>
          <p className="text-sm text-muted-foreground">
            {isCoordinator ? 'Registre e acompanhe a presença dos alunos' : 'Registre a presença dos alunos de suas turmas'}
          </p>
        </div>
        {canMark && (
          <Button onClick={openMarking} className="bg-emerald-600 hover:bg-emerald-700">
            <ClipboardCheck className="size-4 mr-2" />
            Registrar Presença
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Turma</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
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
              <Label>Data</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance table */}
      {!selectedClassId ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <ClipboardCheck className="size-12 mx-auto mb-3 opacity-30" />
            <p>Selecione uma turma para ver o histórico de presença</p>
          </CardContent>
        </Card>
      ) : recordsLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" />
          Carregando registros...
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Users className="size-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum registro de presença para esta turma</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(r => {
                  const cfg = statusConfig[r.status] || statusConfig.present;
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="size-4 text-muted-foreground" />
                          {r.studentName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(r.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${cfg.color}`}>
                          <Icon className="size-3 mr-1" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Mark Attendance Dialog */}
      <Dialog open={markingOpen} onOpenChange={setMarkingOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-emerald-600" />
              Registrar Presença
            </DialogTitle>
            <DialogDescription>
              {format(parseISO(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {Object.entries(attendanceMap).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum aluno nesta turma
              </p>
            ) : (
              Object.entries(attendanceMap).map(([studentId, status]) => {
                const turma = turmas.find(t => t.id === selectedClassId);
                const student = turma?.students?.find(s => s.id === studentId);
                const cfg = statusConfig[status];

                return (
                  <div key={studentId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{student?.name || studentId}</span>
                    <div className="flex gap-1">
                      {(['present', 'absent', 'justified'] as const).map(s => {
                        const sc = statusConfig[s];
                        const isActive = status === s;
                        return (
                          <Button
                            key={s}
                            size="sm"
                            variant={isActive ? 'default' : 'outline'}
                            className={`text-xs h-8 px-2 ${
                              isActive
                                ? s === 'present' ? 'bg-emerald-600 hover:bg-emerald-700'
                                  : s === 'absent' ? 'bg-red-600 hover:bg-red-700'
                                  : 'bg-amber-600 hover:bg-amber-700'
                                : ''
                            }`}
                            onClick={() => setAttendanceMap(prev => ({ ...prev, [studentId]: s }))}
                          >
                            <sc.icon className="size-3 mr-1" />
                            {sc.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkingOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveAttendance}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Salvar Presença
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
