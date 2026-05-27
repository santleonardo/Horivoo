"use client";

import { DAYS, SCHEDULE, buildMergedSchedule, getDayFull, type MergedSchedule } from "@/lib/constants";
import type { BlockedSlot, Booking, SlotInfo, SlotStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sun, CloudSun, Moon, User, X } from "lucide-react";

interface WeekGridProps {
  blocked: BlockedSlot[];
  booked: Booking[];
  mode: "teacher" | "student" | "coordinator";
  teacherId?: string | null;
  teacherName?: string | null;
  onSlotClick?: (slot: SlotInfo) => void;
}

const periodIcons = {
  manha: Sun,
  tarde: CloudSun,
  noite: Moon,
};

export function WeekGrid({
  blocked,
  booked,
  mode,
  teacherId,
  teacherName,
  onSlotClick,
}: WeekGridProps) {
  // Build lookup maps
  const blockedMap: Record<string, BlockedSlot> = {};
  const bookedMap: Record<string, Booking> = {};

  blocked.forEach((s) => {
    const key =
      mode === "coordinator" && s.teacher_id
        ? `${s.teacher_id}:${s.day}:${s.hour}`
        : `${s.day}:${s.hour}`;
    blockedMap[key] = s;
  });

  booked.forEach((b) => {
    const key =
      mode === "coordinator" && b.teacher_id
        ? `${b.teacher_id}:${b.day}:${b.hour}`
        : `${b.day}:${b.hour}`;
    bookedMap[key] = b;
  });

  const mergedSchedule = buildMergedSchedule(blocked, booked);

  const scheduleHoursSet = new Set([
    ...SCHEDULE.manha.hours,
    ...SCHEDULE.tarde.hours,
    ...SCHEDULE.noite.hours,
  ]);

  const getSlotInfo = (
    dayKey: string,
    hour: string,
    tid?: string | null
  ): {
    status: SlotStatus;
    slotId: string | null;
    studentName: string | null;
  } => {
    const key =
      mode === "coordinator" && tid
        ? `${tid}:${dayKey}:${hour}`
        : `${dayKey}:${hour}`;
    const blockData = blockedMap[key];
    const bookData = bookedMap[key];

    if (bookData) {
      return {
        status: "booked",
        slotId: bookData.id,
        studentName: bookData.student_name,
      };
    }
    if (blockData) {
      return { status: "blocked", slotId: blockData.id, studentName: null };
    }
    return { status: "available", slotId: null, studentName: null };
  };

  const handleClick = (
    dayKey: string,
    hour: string,
    status: SlotStatus,
    slotId: string | null,
    studentName: string | null,
    tid?: string | null,
    tname?: string | null
  ) => {
    // Student mode: ignore blocked/booked clicks
    if (mode === "student" && status !== "available") return;

    onSlotClick?.({
      day: dayKey,
      dayFull: getDayFull(dayKey),
      hour,
      status,
      id: slotId,
      teacherId: tid || teacherId,
      teacherName: tname || teacherName,
      studentName: studentName || undefined,
    });
  };

  const renderSlot = (
    dayKey: string,
    hour: string,
    periodKey: keyof MergedSchedule,
    tid?: string | null,
    tname?: string | null
  ) => {
    const { status, slotId, studentName } = getSlotInfo(dayKey, hour, tid);
    const isCustom = !scheduleHoursSet.has(hour);
    const isStudent = mode === "student";

    let slotClass = "";
    let label: React.ReactNode = hour;

    if (status === "booked") {
      slotClass = isStudent
        ? "bg-purple-100 text-purple-700 border-purple-200 opacity-70 cursor-not-allowed"
        : "bg-purple-100 text-purple-700 border-purple-200 cursor-pointer hover:bg-purple-200";
      label = (
        <span className="flex items-center gap-1">
          {hour} <User className="h-3 w-3" /> {studentName || ""}
        </span>
      );
    } else if (status === "blocked") {
      slotClass = isStudent
        ? "bg-red-50 text-destructive border-red-200 opacity-70 cursor-not-allowed"
        : "bg-red-50 text-destructive border-red-200 cursor-pointer hover:bg-red-100";
      label = (
        <span className="flex items-center gap-1">
          {hour} <X className="h-3 w-3" />
        </span>
      );
    } else {
      slotClass = isStudent
        ? "bg-green-50 text-green-700 border-green-200 cursor-pointer hover:bg-green-100"
        : "bg-green-50 text-green-700 border-green-200 cursor-pointer hover:bg-green-100";
    }

    if (isCustom) {
      slotClass += " ring-1 ring-amber-300";
    }

    return (
      <button
        key={`${dayKey}-${hour}-${tid || "x"}`}
        className={cn(
          "w-full text-left text-xs sm:text-sm px-2 py-1.5 rounded-md border transition-colors truncate",
          slotClass
        )}
        disabled={isStudent && status !== "available"}
        onClick={() => handleClick(dayKey, hour, status, slotId, studentName, tid, tname)}
        title={
          status === "booked"
            ? `Agendado: ${studentName}`
            : status === "blocked"
            ? "Bloqueado"
            : "Disponível"
        }
      >
        {label}
      </button>
    );
  };

  const renderPeriod = (
    periodKey: keyof MergedSchedule,
    period: { label: string; hours: string[] },
    dayKey: string,
    tid?: string | null,
    tname?: string | null
  ) => {
    const Icon = periodIcons[periodKey];
    return (
      <div key={periodKey} className="mb-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium mb-1 px-1">
          <Icon className="h-3 w-3" />
          {period.label}
        </div>
        <div className="space-y-0.5">
          {period.hours.map((hour) => renderSlot(dayKey, hour, periodKey, tid, tname))}
        </div>
      </div>
    );
  };

  // Coordinator "all teachers" mode
  if (mode === "coordinator" && !teacherId) {
    // Group by teacher
    const teacherMap = new Map<string, string>();
    blocked.forEach((s) => {
      if (s.teacher_id) teacherMap.set(s.teacher_id, "");
    });
    booked.forEach((b) => {
      if (b.teacher_id) teacherMap.set(b.teacher_id, b.student_name || "");
    });

    // Add current teacherName if available
    const teacherEntries: Array<{ tid: string; tname: string }> = [];
    const seenIds = new Set<string>();

    blocked.forEach((s) => {
      if (s.teacher_id && !seenIds.has(s.teacher_id)) {
        seenIds.add(s.teacher_id);
        teacherEntries.push({ tid: s.teacher_id, tname: "" });
      }
    });
    booked.forEach((b) => {
      if (b.teacher_id && !seenIds.has(b.teacher_id)) {
        seenIds.add(b.teacher_id);
        teacherEntries.push({ tid: b.teacher_id, tname: "" });
      }
    });

    if (teacherEntries.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum horário registrado.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {teacherEntries.map(({ tid, tname }) => (
          <div key={tid} className="border rounded-lg p-3">
            <div className="text-sm font-semibold text-foreground mb-2">
              {tname || "Professor"}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day) => (
                <div key={day.key} className="min-w-0">
                  <div className="text-center text-xs font-semibold text-muted-foreground mb-1">
                    {day.label}
                  </div>
                  {(Object.entries(mergedSchedule) as [keyof MergedSchedule, { label: string; hours: string[] }][]).map(
                    ([periodKey, period]) => renderPeriod(periodKey, period, day.key, tid, tname)
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Single teacher view (teacher/student/coordinator single)
  return (
    <div className="grid grid-cols-7 gap-2">
      {DAYS.map((day) => (
        <div key={day.key} className="min-w-0">
          <div className="text-center mb-1">
            <div className="text-xs font-bold text-foreground">{day.label}</div>
            <div className="text-[10px] text-muted-foreground">{day.full}</div>
          </div>
          {(Object.entries(mergedSchedule) as [keyof MergedSchedule, { label: string; hours: string[] }][]).map(
            ([periodKey, period]) => renderPeriod(periodKey, period, day.key, teacherId, teacherName)
          )}
        </div>
      ))}
    </div>
  );
}
