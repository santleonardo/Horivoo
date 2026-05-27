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
import type { SlotStatus } from "@/lib/types";

interface CoordEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotInfo: {
    day: string;
    dayFull: string;
    hour: string;
    status: SlotStatus;
    id: string | null;
    teacherId?: string | null;
    teacherName?: string | null;
    studentName?: string | null;
    studentEmail?: string | null;
  };
  onSave: (data: {
    teacherId: string;
    day: string;
    hour: string;
    studentName: string;
    studentEmail: string;
    type: SlotStatus;
    id: string | null;
  }) => Promise<void>;
  onBlock: (teacherId: string, day: string, hour: string) => Promise<void>;
  onUnblock: (id: string) => Promise<void>;
  onCancelBooking: (id: string) => Promise<void>;
}

export function CoordEditModal({
  open,
  onOpenChange,
  slotInfo,
  onSave,
  onBlock,
  onUnblock,
  onCancelBooking,
}: CoordEditModalProps) {
  const [customHour, setCustomHour] = useState(slotInfo.hour || "");
  const [studentName, setStudentName] = useState(
    slotInfo.studentName || ""
  );
  const [studentEmail, setStudentEmail] = useState(
    slotInfo.studentEmail || ""
  );
  const [loading, setLoading] = useState(false);

  // Reset when slot changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setCustomHour(slotInfo.hour || "");
      setStudentName(slotInfo.studentName || "");
      setStudentEmail(slotInfo.studentEmail || "");
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!customHour) {
      toast.error("Informe o horário.");
      return;
    }
    if (
      (slotInfo.status === "available" || slotInfo.status === "booked") &&
      !studentName.trim()
    ) {
      toast.error("Informe o nome do aluno.");
      return;
    }

    setLoading(true);
    try {
      await onSave({
        teacherId: slotInfo.teacherId || "",
        day: slotInfo.day,
        hour: customHour,
        studentName: studentName.trim(),
        studentEmail: studentEmail.trim(),
        type: slotInfo.status,
        id: slotInfo.id,
      });
      onOpenChange(false);
    } catch {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!customHour) {
      toast.error("Informe o horário.");
      return;
    }
    setLoading(true);
    try {
      await onBlock(slotInfo.teacherId || "", slotInfo.day, customHour);
      onOpenChange(false);
    } catch {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!slotInfo.id) return;
    setLoading(true);
    try {
      await onUnblock(slotInfo.id);
      onOpenChange(false);
    } catch {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!slotInfo.id) return;
    if (!confirm("Cancelar este agendamento?")) return;
    setLoading(true);
    try {
      await onCancelBooking(slotInfo.id);
      onOpenChange(false);
    } catch {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (slotInfo.status === "available") return "Adicionar horário";
    return "Editar horário";
  };

  const tname = slotInfo.teacherName || "Professor";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {tname} — {slotInfo.dayFull} às {slotInfo.hour}
          </div>

          <div className="space-y-2">
            <Label htmlFor="coord-edit-hour">Horário</Label>
            <Input
              id="coord-edit-hour"
              type="time"
              value={customHour}
              onChange={(e) => setCustomHour(e.target.value)}
            />
          </div>

          {(slotInfo.status === "available" || slotInfo.status === "booked") && (
            <>
              <div className="space-y-2">
                <Label htmlFor="coord-edit-student-name">Nome do Aluno</Label>
                <Input
                  id="coord-edit-student-name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Nome do aluno"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coord-edit-student-email">
                  E-mail do Aluno (opcional)
                </Label>
                <Input
                  id="coord-edit-student-email"
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="aluno@email.com"
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {(slotInfo.status === "available" || slotInfo.status === "booked") && (
            <Button
              onClick={handleSave}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          )}
          {slotInfo.status === "available" && (
            <Button
              variant="destructive"
              onClick={handleBlock}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Bloquear horário
            </Button>
          )}
          {slotInfo.status === "blocked" && (
            <Button
              onClick={handleUnblock}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Desbloquear
            </Button>
          )}
          {slotInfo.status === "booked" && (
            <Button
              variant="outline"
              onClick={handleCancelBooking}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar agendamento
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
