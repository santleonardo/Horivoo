"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotInfo: {
    day: string;
    dayFull: string;
    hour: string;
    teacherName?: string | null;
  };
  onConfirm: (data: {
    studentName: string;
    studentEmail: string;
    hour: string;
  }) => Promise<void>;
}

export function BookingModal({
  open,
  onOpenChange,
  slotInfo,
  onConfirm,
}: BookingModalProps) {
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [customHour, setCustomHour] = useState(slotInfo.hour || "");
  const [loading, setLoading] = useState(false);

  // Reset when slot changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setStudentName("");
      setStudentEmail("");
      setCustomHour(slotInfo.hour || "");
    }
    onOpenChange(isOpen);
  };

  const handleConfirm = async () => {
    if (!studentName.trim()) {
      toast.error("Por favor, informe seu nome.");
      return;
    }
    if (!customHour) {
      toast.error("Por favor, informe o horário.");
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        studentName: studentName.trim(),
        studentEmail: studentEmail.trim(),
        hour: customHour,
      });
      onOpenChange(false);
    } catch {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Horário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {slotInfo.dayFull} às {slotInfo.hour}
            {slotInfo.teacherName && ` — ${slotInfo.teacherName}`}
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-time">Horário</Label>
            <Input
              id="booking-time"
              type="time"
              value={customHour}
              onChange={(e) => setCustomHour(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="student-name">Seu Nome *</Label>
            <Input
              id="student-name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="student-email">E-mail (opcional)</Label>
            <Input
              id="student-email"
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Agendando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
