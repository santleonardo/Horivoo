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
  notes               TEXT,
  recurring_id        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_teacher ON bookings(teacher_id, date);

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
