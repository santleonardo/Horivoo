/**
 * db.ts — Database access using better-sqlite3 (no Prisma)
 * Auto-creates all tables on first connection.
 * No terminal commands needed — just upload and run.
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'db');
const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || path.join(DB_DIR, 'custom.db');

// Ensure db directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const globalForDb = globalThis as unknown as {
  _db: Database.Database | undefined;
};

export const db = globalForDb._db ?? new Database(DB_PATH);

if (process.env.NODE_ENV !== 'production') globalForDb._db = db;

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Auto-create tables if they don't exist (runs only once)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    email      TEXT UNIQUE NOT NULL,
    name       TEXT NOT NULL,
    password   TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'teacher',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS teachers (
    id         TEXT PRIMARY KEY,
    user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    subjects   TEXT DEFAULT '',
    bio        TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);

  CREATE TABLE IF NOT EXISTS coordinators (
    id         TEXT PRIMARY KEY,
    user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS students (
    id         TEXT PRIMARY KEY,
    user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    phone      TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS available_slots (
    id           TEXT PRIMARY KEY,
    teacher_id   TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    day_of_week  INT NOT NULL,
    start_time   TEXT NOT NULL,
    end_time     TEXT NOT NULL,
    created_at   TEXT DEFAULT (datetime('now')),
    UNIQUE(teacher_id, day_of_week, start_time, end_time)
  );

  CREATE TABLE IF NOT EXISTS blocked_slots (
    id           TEXT PRIMARY KEY,
    teacher_id   TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    date         TEXT NOT NULL,
    start_time   TEXT NOT NULL,
    end_time     TEXT NOT NULL,
    reason       TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id                  TEXT PRIMARY KEY,
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
    notes               TEXT DEFAULT '',
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bookings_teacher ON bookings(teacher_id, date);

  CREATE TABLE IF NOT EXISTS recurring_bookings (
    id            TEXT PRIMARY KEY,
    teacher_id    TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    student_name  TEXT NOT NULL,
    student_email TEXT,
    day_of_week   INT NOT NULL,
    start_time    TEXT NOT NULL,
    end_time      TEXT NOT NULL,
    active        INTEGER DEFAULT 1,
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS non_class_days (
    id         TEXT PRIMARY KEY,
    date       TEXT UNIQUE NOT NULL,
    reason     TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS holidays (
    id        TEXT PRIMARY KEY,
    date      TEXT NOT NULL,
    name      TEXT NOT NULL,
    type      TEXT NOT NULL DEFAULT 'nacional',
    recurring INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS recesses (
    id          TEXT PRIMARY KEY,
    start_date  TEXT NOT NULL,
    end_date    TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS blocked_periods (
    id         TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    start_date TEXT NOT NULL,
    end_date   TEXT NOT NULL,
    reason     TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Helper: run a SELECT query and return rows as array of objects
export function all<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
  const stmt = db.prepare(sql);
  return stmt.all(...(params || [])) as T[];
}

// Helper: run a SELECT query and return first row or undefined
export function get<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | undefined {
  const stmt = db.prepare(sql);
  return stmt.get(...(params || [])) as T | undefined;
}

// Helper: run an INSERT/UPDATE/DELETE and return info
export function run(sql: string, params?: unknown[]): Database.RunResult {
  const stmt = db.prepare(sql);
  return stmt.run(...(params || []));
}

// Helper: run multiple operations in a transaction
export function transaction<T>(fn: () => T): T {
  const t = db.transaction(fn);
  return t();
}

export default db;
