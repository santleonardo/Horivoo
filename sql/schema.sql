-- ============================================================
-- HORIVOO — Schema Supabase (snake_case)
-- Execute no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  password   TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'teacher',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teachers (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  subjects   TEXT DEFAULT '',
  bio        TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);

CREATE TABLE IF NOT EXISTS coordinators (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS available_slots (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  teacher_id   TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  day_of_week  INT NOT NULL,
  start_time   TEXT NOT NULL,
  end_time     TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, day_of_week, start_time, end_time)
);

CREATE TABLE IF NOT EXISTS blocked_slots (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  teacher_id   TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  date         TEXT NOT NULL,
  start_time   TEXT NOT NULL,
  end_time     TEXT NOT NULL,
  reason       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  teacher_id          TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  student_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
  student_profile_id  TEXT REFERENCES students(id) ON DELETE SET NULL,
  student_name        TEXT NOT NULL,
  student_email       TEXT,
  date                TEXT NOT NULL,
  day_of_week         INT NOT NULL,
  start_time          TEXT NOT NULL,
  end_time            TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'confirmed',
  recurring_id        TEXT,
  booking_type        TEXT NOT NULL DEFAULT 'normal',
  original_booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  notes               TEXT DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_teacher ON bookings(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_original ON bookings(original_booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings(booking_type);

CREATE TABLE IF NOT EXISTS recurring_bookings (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  teacher_id    TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  student_name  TEXT NOT NULL,
  student_email TEXT,
  day_of_week   INT NOT NULL,
  start_time    TEXT NOT NULL,
  end_time      TEXT NOT NULL,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS non_class_days (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date       TEXT UNIQUE NOT NULL,
  reason     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS holidays (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date      TEXT NOT NULL,
  name      TEXT NOT NULL,
  type      TEXT NOT NULL DEFAULT 'nacional',
  recurring BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS recesses (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocked_periods (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date   TEXT NOT NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Novas tabelas — v0.4 (turmas, agendamentos, provas, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS classes (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL,
  subject    TEXT NOT NULL,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);

CREATE TABLE IF NOT EXISTS class_students (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  class_id   TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_class_students_class ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id);

CREATE TABLE IF NOT EXISTS appointments (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  teacher_id          TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  student_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
  class_id            TEXT REFERENCES classes(id) ON DELETE SET NULL,
  date                TEXT NOT NULL,
  day_of_week         INT NOT NULL,
  start_time          TEXT NOT NULL,
  end_time            TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'confirmed',
  recurring_group_id  TEXT,
  booking_type        TEXT NOT NULL DEFAULT 'normal',
  original_booking_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  notes               TEXT DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_teacher ON appointments(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_student ON appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_appointments_class ON appointments(class_id);
CREATE INDEX IF NOT EXISTS idx_appointments_recurring ON appointments(recurring_group_id);
CREATE INDEX IF NOT EXISTS idx_appointments_original ON appointments(original_booking_id);
CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments(booking_type);

CREATE TABLE IF NOT EXISTS tests (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  class_id   TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  date       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tests_class ON tests(class_id);
CREATE INDEX IF NOT EXISTS idx_tests_date ON tests(date);

CREATE TABLE IF NOT EXISTS attendance (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id     TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'present',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, appointment_id)
);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_appointment ON attendance(appointment_id);

CREATE TABLE IF NOT EXISTS make_up_classes (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  original_appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  new_date                TEXT NOT NULL,
  new_start_time          TEXT NOT NULL,
  new_end_time            TEXT NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_makeups_original ON make_up_classes(original_appointment_id);

-- RLS: desabilitar para MVP simples (reative quando tiver auth Supabase)
ALTER TABLE users              DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers           DISABLE ROW LEVEL SECURITY;
ALTER TABLE coordinators       DISABLE ROW LEVEL SECURITY;
ALTER TABLE students           DISABLE ROW LEVEL SECURITY;
ALTER TABLE available_slots    DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots      DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings           DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE non_class_days     DISABLE ROW LEVEL SECURITY;
ALTER TABLE holidays           DISABLE ROW LEVEL SECURITY;
ALTER TABLE recesses           DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_periods    DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes            DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_students     DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments       DISABLE ROW LEVEL SECURITY;
ALTER TABLE tests              DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance         DISABLE ROW LEVEL SECURITY;
ALTER TABLE make_up_classes    DISABLE ROW LEVEL SECURITY;
