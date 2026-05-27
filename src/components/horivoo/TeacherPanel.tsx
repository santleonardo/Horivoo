"use client";

import { useState, useEffect, useCallback } from "react";
import { WeekGrid } from "./WeekGrid";
import { StatsBar } from "./StatsBar";
import { TeacherSlotModal } from "./TeacherSlotModal";
import { useStore } from "@/lib/store";
import type { BlockedSlot, Booking, SlotInfo } from "@/lib/types";
import { TOTAL_SLOTS } from "@/lib/constants";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, X } from "lucide-react";

export function TeacherPanel() {
  const { teacherId, teacherName } = useStore();
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    day: string;
    dayFull: string;
    hour: string;
    status: "available" | "blocked" | "booked";
    id: string | null;
    studentName?: string | null;
  }>({
    day: "",
    dayFull: "",
    hour: "",
    status: "available",
    id: null,
  });

  const loadData = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      const [blockedRes, bookingsRes] = await Promise.all([
        fetch(`/api/blocked-slots?teacher_id=${teacherId}`),
        fetch(`/api/bookings?teacher_id=${teacherId}`),
      ]);
      const blockedData = await blockedRes.json();
      const bookingsData = await bookingsRes.json();
      setBlocked(Array.isArray(blockedData) ? blockedData : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
    } catch {
      toast.error("Erro ao carregar agenda.");
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSlotClick = (slot: SlotInfo) => {
    setSelectedSlot({
      day: slot.day,
      dayFull: slot.dayFull,
      hour: slot.hour,
      status: slot.status,
      id: slot.id,
      studentName: slot.studentName,
    });
    setModalOpen(true);
  };

  const handleBlock = async (day: string, hour: string) => {
    try {
      const res = await fetch("/api/blocked-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacher_id: teacherId, day, hour }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao bloquear");
      }
      toast.success(`Horário ${hour} (${day}) bloqueado.`);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao bloquear";
      toast.error(msg);
    }
  };

  const handleUnblock = async (id: string) => {
    try {
      const res = await fetch(`/api/blocked-slots/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao desbloquear");
      toast.success("Horário desbloqueado.");
      await loadData();
    } catch {
      toast.error("Erro ao desbloquear horário.");
    }
  };

  const handleCancelBooking = async (id: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao cancelar");
      toast.success("Agendamento cancelado.");
      await loadData();
    } catch {
      toast.error("Erro ao cancelar agendamento.");
    }
  };

  const totalFree = Math.max(0, TOTAL_SLOTS - blocked.length - bookings.length);

  // Sort bookings
  const dayOrder = [
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
    "domingo",
  ];
  const sortedBookings = [...bookings].sort((a, b) => {
    return (
      dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day) ||
      a.hour.localeCompare(b.hour)
    );
  });

  return (
    <div className="space-y-4">
      {/* Teacher name */}
      <div className="flex items-center gap-2">
        <User className="h-5 w-5 text-primary" />
        <span className="font-semibold text-foreground">
          {teacherName || "Professor"}
        </span>
      </div>

      {/* Stats */}
      <StatsBar free={totalFree} blocked={blocked.length} booked={bookings.length} />

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
      <Card>
        <CardContent className="p-3 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Carregando agenda...
            </div>
          ) : (
            <WeekGrid
              blocked={blocked}
              booked={bookings}
              mode="teacher"
              teacherId={teacherId}
              teacherName={teacherName}
              onSlotClick={handleSlotClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Bookings List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedBookings.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Nenhum aluno agendado ainda.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-0">
              {sortedBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-3 border-b last:border-0 gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {b.student_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {b.day.charAt(0).toUpperCase() + b.day.slice(1)} às{" "}
                      {b.hour}
                      {b.student_email && ` • ${b.student_email}`}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={async () => {
                      if (!confirm("Cancelar este agendamento?")) return;
                      try {
                        const res = await fetch(`/api/bookings/${b.id}`, {
                          method: "DELETE",
                        });
                        if (!res.ok) throw new Error();
                        toast.success("Agendamento cancelado.");
                        await loadData();
                      } catch {
                        toast.error("Erro ao cancelar.");
                      }
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teacher Slot Modal */}
      <TeacherSlotModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        slotInfo={selectedSlot}
        onBlock={handleBlock}
        onUnblock={handleUnblock}
        onCancelBooking={handleCancelBooking}
      />
    </div>
  );
}
