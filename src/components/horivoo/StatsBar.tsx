"use client";

import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, UserCheck } from "lucide-react";

interface StatsBarProps {
  free: number;
  blocked: number;
  booked: number;
}

export function StatsBar({ free, blocked, booked }: StatsBarProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="p-3 flex items-center gap-2 border-green-200 bg-green-50">
        <CheckCircle className="h-5 w-5 text-green-700 shrink-0" />
        <div>
          <div className="text-lg font-bold text-green-800">{free}</div>
          <div className="text-xs text-green-600">Disponíveis</div>
        </div>
      </Card>
      <Card className="p-3 flex items-center gap-2 border-destructive/20 bg-red-50">
        <XCircle className="h-5 w-5 text-destructive shrink-0" />
        <div>
          <div className="text-lg font-bold text-destructive">{blocked}</div>
          <div className="text-xs text-destructive/80">Bloqueados</div>
        </div>
      </Card>
      <Card className="p-3 flex items-center gap-2 border-purple-200 bg-purple-50">
        <UserCheck className="h-5 w-5 text-purple-700 shrink-0" />
        <div>
          <div className="text-lg font-bold text-purple-800">{booked}</div>
          <div className="text-xs text-purple-600">Agendados</div>
        </div>
      </Card>
    </div>
  );
}
