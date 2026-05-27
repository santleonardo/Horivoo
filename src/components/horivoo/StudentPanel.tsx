"use client";

import { useState, useEffect, useCallback } from "react";
import { WeekGrid } from "./WeekGrid";
import { BookingModal } from "./BookingModal";
import { useStore } from "@/lib/store";
import type { Teacher, BlockedSlot, Booking, SlotInfo } from "@/lib/types";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";

export function StudentPanel() {
  const { setTab } = useStore();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>("");
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    day: string;
    dayFull: string;
    hour: string;
  }>({
    day: "",
    dayFull: "",
    hour: "",
  });

  // Load teachers
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const res = await fetch("/api/teachers");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTeachers(data);
          setSelectedTeacherId(data[0].id);
          setSelectedTeacherName(data[0].name);
        }
      } catch {
        toast.error("Erro ao carregar professores.");
      }
    };
    loadTeachers();
  }, []);

  // Load teacher data
  const loadTeacherData = useCallback(async (teacherId: string) => {
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
      toast.error("Erro ao carregar horários.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeacherId) {
      loadTeacherData(selectedTeacherId);
    }
  }, [selectedTeacherId, loadTeacherData]);

  const handleSlotClick = (slot: SlotInfo) => {
    if (slot.status !== "available") return;

    // Double-check availability
    const alreadyBooked = bookings.some(
      (b) => b.day === slot.day && b.hour === slot.hour
    );
    const alreadyBlocked = blocked.some(
      (s) => s.day === slot.day && s.hour === slot.hour
    );

    if (alreadyBooked || alreadyBlocked) {
      toast.error("Este horário acabou de ser ocupado. Escolha outro.");
      loadTeacherData(selectedTeacherId);
      return;
    }

    setSelectedSlot({
      day: slot.day,
      dayFull: slot.dayFull,
      hour: slot.hour,
    });
    setBookingModalOpen(true);
  };

  const handleBookingConfirm = async (data: {
    studentName: string;
    studentEmail: string;
    hour: string;
  }) => {
    // Verify again
    const alreadyBooked = bookings.some(
      (b) => b.day === selectedSlot.day && b.hour === data.hour
    );
    const alreadyBlocked = blocked.some(
      (s) => s.day === selectedSlot.day && s.hour === data.hour
    );

    if (alreadyBooked || alreadyBlocked) {
      toast.error("Este horário já está ocupado. Escolha outro.");
      await loadTeacherData(selectedTeacherId);
      return;
    }

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_id: selectedTeacherId,
          student_name: data.studentName,
          student_email: data.studentEmail || null,
          day: selectedSlot.day,
          hour: data.hour,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao agendar");
      }

      toast.success(
        `Agendado com sucesso! ${selectedSlot.day.charAt(0).toUpperCase() + selectedSlot.day.slice(1)} às ${data.hour}.`
      );
      await loadTeacherData(selectedTeacherId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao agendar";
      if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("ocupado")) {
        toast.error("Horário já foi preenchido. Escolha outro.");
        await loadTeacherData(selectedTeacherId);
      } else {
        toast.error("Erro ao agendar. Tente novamente.");
      }
    }
  };

  // Count available slots
  const availableCount = bookings.length + blocked.length > 0
    ? (() => {
        // Approximate: count all schedule hours minus blocked/booked
        const totalStandardHours = 13; // 4+5+4
        return Math.max(0, totalStandardHours * 7 - blocked.length - bookings.length);
      })()
    : 0;

  return (
    <div className="space-y-4">
      {/* Teacher selector */}
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 text-primary shrink-0" />
        <Select
          value={selectedTeacherId}
          onValueChange={(val) => {
            setSelectedTeacherId(val);
            const t = teachers.find((t) => t.id === val);
            setSelectedTeacherName(t?.name || "");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione o professor" />
          </SelectTrigger>
          <SelectContent>
            {teachers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      <Card>
        <CardContent className="p-3 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Buscando horários disponíveis...
            </div>
          ) : teachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CalendarDays className="h-8 w-8 mb-2" />
              <p>Nenhum professor disponível.</p>
            </div>
          ) : (
            <WeekGrid
              blocked={blocked}
              booked={bookings}
              mode="student"
              teacherId={selectedTeacherId}
              teacherName={selectedTeacherName}
              onSlotClick={handleSlotClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Booking Modal */}
      <BookingModal
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        slotInfo={{
          day: selectedSlot.day,
          dayFull: selectedSlot.dayFull,
          hour: selectedSlot.hour,
          teacherName: selectedTeacherName,
        }}
        onConfirm={handleBookingConfirm}
      />
    </div>
  );
}
