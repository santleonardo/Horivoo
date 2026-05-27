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

interface TeacherSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotInfo: {
    day: string;
    dayFull: string;
    hour: string;
    status: SlotStatus;
    id: string | null;
    studentName?: string | null;
  };
  onBlock: (day: string, hour: string) => Promise<void>;
  onUnblock: (id: string) => Promise<void>;
  onCancelBooking: (id: string) => Promise<void>;
}

export function TeacherSlotModal({
  open,
  onOpenChange,
  slotInfo,
  onBlock,
  onUnblock,
  onCancelBooking,
}: TeacherSlotModalProps) {
  const [customHour, setCustomHour] = useState(slotInfo.hour || "");
  const [loading, setLoading] = useState(false);

  // Reset when slot changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setCustomHour(slotInfo.hour || "");
    }
    onOpenChange(isOpen);
  };

  const handleBlock = async () => {
    if (!customHour) {
      toast.error("Informe o horário.");
      return;
    }
    setLoading(true);
    try {
      await onBlock(slotInfo.day, customHour);
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
    if (slotInfo.status === "booked") return "Agendamento recebido";
    if (slotInfo.status === "blocked") return "Horário bloqueado";
    return "Bloquear horário";
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {slotInfo.dayFull} às {slotInfo.hour}
            {slotInfo.status === "booked" && slotInfo.studentName && (
              <span className="block mt-1">
                Aluno: <strong>{slotInfo.studentName}</strong>
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacher-slot-time">Horário</Label>
            <Input
              id="teacher-slot-time"
              type="time"
              value={customHour}
              onChange={(e) => setCustomHour(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {slotInfo.status === "booked" && (
            <>
              <Button
                variant="outline"
                onClick={handleCancelBooking}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Cancelar agendamento
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Fechar
              </Button>
            </>
          )}
          {slotInfo.status === "blocked" && (
            <>
              <Button
                onClick={handleUnblock}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? "Desbloqueando..." : "Desbloquear"}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Fechar
              </Button>
            </>
          )}
          {slotInfo.status === "available" && (
            <>
              <Button
                variant="destructive"
                onClick={handleBlock}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? "Bloqueando..." : "Bloquear"}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Fechar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
