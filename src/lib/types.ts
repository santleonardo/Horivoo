// ================================================================
// HORIVOO — TypeScript Interfaces
// ================================================================

export interface Teacher {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  created_at: string;
}

export interface Booking {
  id: string;
  teacher_id: string;
  student_name: string;
  student_email: string | null;
  day: string;
  hour: string;
  created_at: string;
}

export interface BlockedSlot {
  id: string;
  teacher_id: string;
  day: string;
  hour: string;
  created_at: string;
}

export interface Coordinator {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  created_at: string;
}

export type Tab = "teacher" | "student" | "coordinator";

export type SlotStatus = "available" | "blocked" | "booked";

export interface SlotInfo {
  day: string;
  dayFull: string;
  hour: string;
  status: SlotStatus;
  id: string | null;
  teacherId?: string | null;
  teacherName?: string | null;
  studentName?: string | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "teacher" | "coordinator";
}
