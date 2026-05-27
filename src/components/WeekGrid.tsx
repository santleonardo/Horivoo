'use client';

import { Badge } from '@/components/ui/badge';

export interface SlotInfo {
  startTime: string;
  endTime: string;
  status: 'available' | 'booked' | 'blocked' | 'non_class_day';
  booking?: {
    id: string;
    studentName: string;
    studentEmail?: string;
  };
  recurringBooking?: {
    studentName: string;
  };
  blockedSlot?: {
    id: string;
    reason?: string;
  };
}

export interface DaySchedule {
  date: string;
  dayOfWeek: number;
  dayName: string;
  isNonClassDay: boolean;
  nonClassReason?: string;
  isHoliday: boolean;
  holidayName?: string;
  slots: SlotInfo[];
}

interface WeekGridProps {
  schedule: DaySchedule[];
  mode: 'teacher' | 'student' | 'coordinator';
  onSlotClick?: (day: DaySchedule, slot: SlotInfo) => void;
  teacherName?: string;
}

const DAY_NAMES_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_NAMES_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const STATUS_CONFIG = {
  available: { bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200', text: 'text-emerald-700', label: 'Disponível' },
  booked: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Agendado' },
  blocked: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Bloqueado' },
  non_class_day: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Sem aula' },
};

export function WeekGrid({ schedule, mode, onSlotClick, teacherName }: WeekGridProps) {
  const days = schedule.length > 0 ? schedule : Array.from({ length: 7 }, (_, i) => ({
    date: '',
    dayOfWeek: i === 0 ? 0 : i,
    dayName: DAY_NAMES_FULL[i] || DAY_NAMES_SHORT[i] || '',
    isNonClassDay: false,
    isHoliday: false,
    slots: [],
  }));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {days.map((day, i) => (
            <div key={i} className={`text-center p-2 rounded-t-lg text-sm font-medium ${
              day.isNonClassDay || day.isHoliday ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
            }`}>
              <div className="font-bold">{DAY_NAMES_SHORT[day.dayOfWeek]}</div>
              <div className="text-xs mt-0.5">{day.date ? new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}</div>
              {day.isHoliday && day.holidayName && (
                <div className="text-xs text-amber-600 mt-0.5 truncate" title={day.holidayName}>{day.holidayName}</div>
              )}
              {day.isNonClassDay && day.nonClassReason && (
                <div className="text-xs text-amber-600 mt-0.5 truncate" title={day.nonClassReason}>{day.nonClassReason}</div>
              )}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, dayIdx) => (
            <div key={dayIdx} className="space-y-1">
              {day.isNonClassDay && day.slots.length === 0 ? (
                <div className="p-3 text-center text-xs text-amber-600 bg-amber-50 rounded border border-amber-200">
                  Sem aula
                  {day.nonClassReason && <div className="mt-1">{day.nonClassReason}</div>}
                </div>
              ) : day.slots.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-400">Sem horários</div>
              ) : (
                day.slots.map((slot, slotIdx) => {
                  const cfg = STATUS_CONFIG[slot.status];
                  const isClickable = mode === 'student' ? slot.status === 'available' : true;

                  return (
                    <button
                      key={slotIdx}
                      onClick={() => isClickable && onSlotClick?.(day, slot)}
                      disabled={!isClickable && mode === 'student'}
                      className={`w-full text-left p-2 rounded border text-xs transition-all ${
                        cfg.bg
                      } ${isClickable ? 'cursor-pointer hover:shadow-md' : mode === 'student' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      title={
                        slot.status === 'booked'
                          ? `Agendado: ${slot.booking?.studentName || slot.recurringBooking?.studentName || ''}`
                          : slot.status === 'blocked'
                          ? 'Bloqueado'
                          : slot.status === 'non_class_day'
                          ? 'Dia sem aula'
                          : 'Disponível — clique para agendar'
                      }
                    >
                      <div className={`font-semibold ${cfg.text}`}>
                        {slot.startTime}-{slot.endTime}
                      </div>
                      {slot.status === 'booked' && (
                        <div className="text-blue-600 truncate mt-0.5">
                          {slot.booking?.studentName || slot.recurringBooking?.studentName || ''}
                        </div>
                      )}
                      {slot.status === 'available' && mode !== 'student' && (
                        <div className="text-emerald-500 mt-0.5">Livre</div>
                      )}
                      {mode === 'coordinator' && teacherName && (
                        <div className="text-gray-400 truncate mt-0.5">{teacherName}</div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
