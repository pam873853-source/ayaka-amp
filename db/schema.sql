-- =====================================================================
-- AYAKA MOTION - Complete Neon Postgres Schema
-- Jalankan semua DDL ini di Neon SQL Editor (atau via ensureTables)
-- =====================================================================

-- ============================================================
-- 1. USERS — Akun Pengguna (menyimpan akun & email)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id                  SERIAL PRIMARY KEY,
    user_id             TEXT UNIQUE NOT NULL,          -- UUID unik per user (dari client)
    username            TEXT NOT NULL,
    email               TEXT NOT NULL,
    plan                TEXT NOT NULL DEFAULT 'free',  -- none|free|pro|enterprise
    remaining_limit     INTEGER NOT NULL DEFAULT 0,
    max_limit           INTEGER NOT NULL DEFAULT 0,
    has_claimed_free    BOOLEAN NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          BIGINT NOT NULL,
    updated_at          BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_id     ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_plan        ON users(plan);

-- ============================================================
-- 2. SESSIONS — Sesi Login Real-time (riwayat login/logout)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    id              SERIAL PRIMARY KEY,
    session_id      TEXT UNIQUE NOT NULL,
    user_id         TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    email           TEXT,
    username        TEXT,
    login_at        BIGINT NOT NULL,
    logout_at       BIGINT,
    last_seen       BIGINT NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address      TEXT,
    user_agent      TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id  ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id     ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active      ON sessions(is_active, last_seen);

-- ============================================================
-- 3. ACTIVATIONS — Riwayat Aktivasi (email hasil aktivasi)
-- ============================================================
CREATE TABLE IF NOT EXISTS activations (
    id              SERIAL PRIMARY KEY,
    user_email      TEXT NOT NULL,
    package_type    TEXT NOT NULL,
    timestamp       BIGINT NOT NULL,
    date_string     TEXT,
    sender_id       TEXT,
    session_id      TEXT,
    user_id         TEXT,
    status          TEXT NOT NULL DEFAULT 'success', -- success|failed|pending
    notes           TEXT
);
CREATE INDEX IF NOT EXISTS idx_activations_timestamp ON activations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activations_email     ON activations(user_email);
CREATE INDEX IF NOT EXISTS idx_activations_status    ON activations(status);

-- ============================================================
-- 4. REPORTS — Laporan Bug / Keluh Kesah User (menu Bantuan)
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
    id              SERIAL PRIMARY KEY,
    category        TEXT NOT NULL,
    description     TEXT NOT NULL,
    timestamp       BIGINT NOT NULL,
    date_string     TEXT,
    sender_id       TEXT,
    user_email      TEXT,
    session_id      TEXT,
    status          TEXT NOT NULL DEFAULT 'open',   -- open|in_progress|resolved
    admin_notes     TEXT
);
CREATE INDEX IF NOT EXISTS idx_reports_timestamp ON reports(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status    ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_email     ON reports(user_email);

-- ============================================================
-- 5. VISITORS — Presence Pengunjung Online (60s window)
-- ============================================================
CREATE TABLE IF NOT EXISTS visitors (
    visitor_id TEXT PRIMARY KEY,
    last_seen BIGINT NOT NULL,
    first_seen BIGINT NOT NULL DEFAULT 0,
    user_email TEXT,
    user_agent TEXT,
    ip_address TEXT
);

-- Index untuk mempercepat pencarian pengunjung aktif
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors(last_seen DESC);

-- ============================================================
-- 6. UPTIME — Server Uptime Tracking (heartbeat per menit)
-- ============================================================
CREATE TABLE IF NOT EXISTS uptime (
    id              SERIAL PRIMARY KEY,
    check_at        BIGINT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'up',     -- up|down|degraded
    response_ms     INTEGER DEFAULT 0,
    app_version     TEXT,
    node_version    TEXT,
    region          TEXT
);
CREATE INDEX IF NOT EXISTS idx_uptime_check_at ON uptime(check_at DESC);
CREATE INDEX IF NOT EXISTS idx_uptime_status   ON uptime(status);

-- ============================================================
-- 7. PAYMENTS — Bukti Transfer Plan (pending → verified)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id              SERIAL PRIMARY KEY,
    user_email      TEXT NOT NULL,
    plan_key        TEXT NOT NULL,                  -- pro|enterprise
    plan_label      TEXT NOT NULL,
    amount          TEXT NOT NULL,
    proof_url       TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',-- pending|verified|rejected
    timestamp       BIGINT NOT NULL,
    date_string     TEXT,
    session_id      TEXT,
    notes           TEXT
);
CREATE INDEX IF NOT EXISTS idx_payments_status    ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_email     ON payments(user_email);

-- ============================================================
-- 8. VOUCHERS — Kode Aktivasi Plan
-- ============================================================
CREATE TABLE IF NOT EXISTS vouchers (
    id              SERIAL PRIMARY KEY,
    code            TEXT UNIQUE NOT NULL,
    plan_key        TEXT NOT NULL,
    max_limit       INTEGER NOT NULL,
    used            BOOLEAN NOT NULL DEFAULT FALSE,
    used_by         TEXT,
    used_at         BIGINT,
    created_at      BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_used ON vouchers(used);