"use client";

import { useState, useEffect, useCallback } from "react";
import { WeekGrid } from "./WeekGrid";
import { StatsBar } from "./StatsBar";
import { CoordEditModal } from "./CoordEditModal";
import { useStore } from "@/lib/store";
import type { Teacher, BlockedSlot, Booking, SlotInfo, SlotStatus } from "@/lib/types";
import { TOTAL_SLOTS, DAYS } from "@/lib/constants";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Search, Share2, Pencil, Trash2 } from "lucide-react";

type FilterType = "all" | "hour" | "teacher" | "student";

export function CoordinatorPanel() {
  const { coordinatorName } = useStore();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("__all__");
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>("Todos");
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & filter
  const [searchFilter, setSearchFilter] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<{
    day: string;
    dayFull: string;
    hour: string;
    status: SlotStatus;
    id: string | null;
    teacherId?: string | null;
    teacherName?: string | null;
    studentName?: string | null;
    studentEmail?: string | null;
  }>({
    day: "",
    dayFull: "",
    hour: "",
    status: "available",
    id: null,
  });

  // Load teachers
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const res = await fetch("/api/teachers");
        const data = await res.json();
        if (Array.isArray(data)) {
          setTeachers(data);
        }
      } catch {
        toast.error("Erro ao carregar professores.");
      }
    };
    loadTeachers();
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedTeacherId && selectedTeacherId !== "__all__") {
        const [blockedRes, bookingsRes] = await Promise.all([
          fetch(`/api/blocked-slots?teacher_id=${selectedTeacherId}`),
          fetch(`/api/bookings?teacher_id=${selectedTeacherId}`),
        ]);
        const blockedData = await blockedRes.json();
        const bookingsData = await bookingsRes.json();
        setBlocked(Array.isArray(blockedData) ? blockedData : []);
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      } else {
        // Load all
        const allBlocked: BlockedSlot[] = [];
        const allBooked: Booking[] = [];
        for (const t of teachers) {
          try {
            const [bRes, bkRes] = await Promise.all([
              fetch(`/api/blocked-slots?teacher_id=${t.id}`),
              fetch(`/api/bookings?teacher_id=${t.id}`),
            ]);
            const bData = await bRes.json();
            const bkData = await bkRes.json();
            if (Array.isArray(bData)) {
              allBlocked.push(
                ...bData.map((s: BlockedSlot) => ({
                  ...s,
                  teacher_id: s.teacher_id || t.id,
                }))
              );
            }
            if (Array.isArray(bkData)) {
              allBooked.push(
                ...bkData.map((b: Booking) => ({
                  ...b,
                  teacher_id: b.teacher_id || t.id,
                }))
              );
            }
          } catch {
            // skip
          }
        }
        setBlocked(allBlocked);
        setBookings(allBooked);
      }
    } catch {
      toast.error("Erro ao carregar horários.");
    } finally {
      setLoading(false);
    }
  }, [selectedTeacherId, teachers]);

  useEffect(() => {
    if (teachers.length > 0) {
      loadData();
    }
  }, [selectedTeacherId, teachers, loadData]);

  // Teacher name lookup
  const getTeacherName = (teacherId: string): string => {
    const t = teachers.find((t) => t.id === teacherId);
    return t?.name || "Professor";
  };

  // Slot click
  const handleSlotClick = (slot: SlotInfo) => {
    setEditSlot({
      day: slot.day,
      dayFull: slot.dayFull,
      hour: slot.hour,
      status: slot.status,
      id: slot.id,
      teacherId: slot.teacherId || selectedTeacherId,
      teacherName: slot.teacherName || getTeacherName(slot.teacherId || selectedTeacherId),
      studentName: slot.studentName,
    });
    setEditModalOpen(true);
  };

  // Coordinator actions
  const handleSave = async (data: {
    teacherId: string;
    day: string;
    hour: string;
    studentName: string;
    studentEmail: string;
    type: SlotStatus;
    id: string | null;
  }) => {
    try {
      if (data.type === "booked" && data.id) {
        // Edit: delete old, create new
        await fetch(`/api/bookings/${data.id}`, { method: "DELETE" });
      }
      if (data.type === "available" || data.type === "booked") {
        // Create new booking
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacher_id: data.teacherId,
            student_name: data.studentName || "Aluno",
            student_email: data.studentEmail || null,
            day: data.day,
            hour: data.hour,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Erro");
        }
        toast.success("Agendamento salvo!");
      }
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(msg);
    }
  };

  const handleBlock = async (teacherId: string, day: string, hour: string) => {
    try {
      const res = await fetch("/api/blocked-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacher_id: teacherId, day, hour }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro");
      }
      toast.success("Horário bloqueado!");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao bloquear";
      toast.error(msg);
    }
  };

  const handleUnblock = async (id: string) => {
    try {
      const res = await fetch(`/api/blocked-slots/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Horário desbloqueado!");
      await loadData();
    } catch {
      toast.error("Erro ao desbloquear.");
    }
  };

  const handleCancelBooking = async (id: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Agendamento cancelado!");
      await loadData();
    } catch {
      toast.error("Erro ao cancelar.");
    }
  };

  // Share
  const handleShare = () => {
    toast.info("Gerando imagem...");
    // Simple share using Web Share API or download
    const gridEl = document.querySelector("[data-coord-grid]");
    if (!gridEl) {
      toast.error("Grade não encontrada.");
      return;
    }

    // Try Web Share API first
    if (navigator.share) {
      navigator
        .share({
          title: "Horivoo - Grade de Horários",
          text: `Grade de horários - ${selectedTeacherName}`,
          url: window.location.href,
        })
        .catch(() => {
          // User cancelled or error
        });
      return;
    }

    // Fallback: copy URL to clipboard
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success("Link copiado!"))
      .catch(() => toast.error("Erro ao copiar link."));
  };

  // Stats
  const teacherCount =
    selectedTeacherId === "__all__" ? teachers.length : 1;
  const totalFree = Math.max(
    0,
    TOTAL_SLOTS * teacherCount - blocked.length - bookings.length
  );

  // Table items
  const tableItems = [
    ...blocked.map((s) => ({
      type: "blocked" as const,
      teacher_id: s.teacher_id,
      teacher_name: getTeacherName(s.teacher_id),
      day: s.day,
      hour: s.hour,
      student_name: "",
      student_email: "",
      id: s.id,
    })),
    ...bookings.map((b) => ({
      type: "booked" as const,
      teacher_id: b.teacher_id,
      teacher_name: getTeacherName(b.teacher_id),
      day: b.day,
      hour: b.hour,
      student_name: b.student_name,
      student_email: b.student_email || "",
      id: b.id,
    })),
  ];

  // Filter
  const filtered = tableItems.filter((item) => {
    if (!searchFilter) return true;
    const sf = searchFilter.toLowerCase();
    switch (filterType) {
      case "hour":
        return item.hour.includes(sf);
      case "teacher":
        return item.teacher_name.toLowerCase().includes(sf);
      case "student":
        return item.student_name.toLowerCase().includes(sf);
      default:
        return (
          item.hour.includes(sf) ||
          item.teacher_name.toLowerCase().includes(sf) ||
          item.student_name.toLowerCase().includes(sf) ||
          item.day.toLowerCase().includes(sf)
        );
    }
  });

  // Sort
  const dayOrder = [
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
    "domingo",
  ];
  filtered.sort((a, b) => {
    const tc = a.teacher_name.localeCompare(b.teacher_name);
    if (tc !== 0) return tc;
    const dc = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    if (dc !== 0) return dc;
    return a.hour.localeCompare(b.hour);
  });

  return (
    <div className="space-y-4">
      {/* Teacher selector */}
      <div className="flex items-center gap-3">
        <ClipboardList className="h-5 w-5 text-primary shrink-0" />
        <Select
          value={selectedTeacherId}
          onValueChange={(val) => {
            setSelectedTeacherId(val);
            if (val === "__all__") {
              setSelectedTeacherName("Todos");
            } else {
              const t = teachers.find((t) => t.id === val);
              setSelectedTeacherName(t?.name || "");
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os professores</SelectItem>
            {teachers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <StatsBar free={totalFree} blocked={blocked.length} booked={bookings.length} />

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-1">
          {([
            { key: "all", label: "Tudo" },
            { key: "hour", label: "Hora" },
            { key: "teacher", label: "Prof." },
            { key: "student", label: "Aluno" },
          ] as const).map((f) => (
            <Button
              key={f.key}
              variant={filterType === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-200" />
          Disponível
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-200" />
          Bloqueado
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-200" />
          Agendado
        </div>
      </div>

      {/* Week Grid */}
      <Card data-coord-grid>
        <CardContent className="p-3 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Carregando horários...
            </div>
          ) : teachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <ClipboardList className="h-8 w-8 mb-2" />
              <p>Nenhum professor cadastrado.</p>
            </div>
          ) : (
            <WeekGrid
              blocked={blocked}
              booked={bookings}
              mode="coordinator"
              teacherId={selectedTeacherId === "__all__" ? null : selectedTeacherId}
              teacherName={selectedTeacherName}
              onSlotClick={handleSlotClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Tabela de Horários</CardTitle>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" />
              Compartilhar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Nenhum resultado encontrado.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Professor</TableHead>
                    <TableHead>Dia</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={`${item.type}-${item.id}`}>
                      <TableCell className="text-sm">
                        {item.teacher_name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.day.charAt(0).toUpperCase() + item.day.slice(1)}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {item.hour}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.student_name || "—"}
                      </TableCell>
                      <TableCell>
                        {item.type === "blocked" ? (
                          <Badge variant="destructive">Bloqueado</Badge>
                        ) : (
                          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                            Agendado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              const dayFull =
                                DAYS.find((d) => d.key === item.day)?.full ||
                                item.day;
                              setEditSlot({
                                day: item.day,
                                dayFull,
                                hour: item.hour,
                                status: item.type,
                                id: item.id,
                                teacherId: item.teacher_id,
                                teacherName: item.teacher_name,
                                studentName: item.student_name,
                                studentEmail: item.student_email,
                              });
                              setEditModalOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={async () => {
                              if (!confirm("Remover este horário?")) return;
                              try {
                                if (item.type === "blocked") {
                                  await fetch(`/api/blocked-slots/${item.id}`, {
                                    method: "DELETE",
                                  });
                                } else {
                                  await fetch(`/api/bookings/${item.id}`, {
                                    method: "DELETE",
                                  });
                                }
                                toast.success("Horário removido!");
                                await loadData();
                              } catch {
                                toast.error("Erro ao remover.");
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
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

      {/* Coord Edit Modal */}
      <CoordEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        slotInfo={editSlot}
        onSave={handleSave}
        onBlock={handleBlock}
        onUnblock={handleUnblock}
        onCancelBooking={handleCancelBooking}
      />
    </div>
  );
}
