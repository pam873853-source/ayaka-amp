import { neon } from '@neondatabase/serverless';

const sql = process.env.NEON_DATABASE_URL ? neon(process.env.NEON_DATABASE_URL) : null;
let tablesInitialized = false;

async function ensureTables() {
    if (!sql || tablesInitialized) return;

    await sql`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'free',
        remaining_limit INTEGER NOT NULL DEFAULT 0,
        max_limit INTEGER NOT NULL DEFAULT 0,
        has_claimed_free BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
    )`;

    await sql`CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        session_id TEXT UNIQUE NOT NULL,
        user_id TEXT,
        email TEXT,
        username TEXT,
        login_at BIGINT NOT NULL,
        logout_at BIGINT,
        last_seen BIGINT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        ip_address TEXT,
        user_agent TEXT
    )`;

    await sql`CREATE TABLE IF NOT EXISTS activations (
        id SERIAL PRIMARY KEY,
        user_email TEXT NOT NULL,
        package_type TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        date_string TEXT,
        sender_id TEXT,
        session_id TEXT,
        user_id TEXT,
        status TEXT NOT NULL DEFAULT 'success',
        notes TEXT
    )`;

    await sql`CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        date_string TEXT,
        sender_id TEXT,
        user_email TEXT,
        session_id TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        admin_notes TEXT
    )`;

    // ===== VISITORS — versi LENGKAP =====
    await sql`CREATE TABLE IF NOT EXISTS visitors (
        visitor_id TEXT PRIMARY KEY,
        last_seen BIGINT NOT NULL,
        first_seen BIGINT NOT NULL DEFAULT 0,
        user_email TEXT,
        user_agent TEXT,
        ip_address TEXT,
        referrer TEXT,
        total_visits INTEGER NOT NULL DEFAULT 1
    )`;

    await sql`CREATE TABLE IF NOT EXISTS uptime (
        id SERIAL PRIMARY KEY,
        check_at BIGINT NOT NULL,
        status TEXT NOT NULL DEFAULT 'up',
        response_ms INTEGER DEFAULT 0,
        app_version TEXT,
        node_version TEXT,
        region TEXT
    )`;

    await sql`CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_email TEXT NOT NULL,
        plan_key TEXT NOT NULL,
        plan_label TEXT NOT NULL,
        amount TEXT NOT NULL,
        proof_url TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        timestamp BIGINT NOT NULL,
        date_string TEXT,
        session_id TEXT,
        notes TEXT
    )`;

    await sql`CREATE TABLE IF NOT EXISTS vouchers (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        plan_key TEXT NOT NULL,
        max_limit INTEGER NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        used_by TEXT,
        used_at BIGINT,
        created_at BIGINT NOT NULL
    )`;

    await sql`CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors(last_seen DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_activations_timestamp ON activations(timestamp DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_reports_timestamp ON reports(timestamp DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_uptime_check_at ON uptime(check_at DESC)`;

    tablesInitialized = true;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!sql) return res.status(503).json({ error: 'Database not configured' });

    try { await ensureTables(); }
    catch (e) { return res.status(500).json({ error: 'Schema init failed', detail: e.message }); }

    const { action, data = {} } = req.body || {};
    const now = Date.now();

    try {
        switch (action) {
            // ===== USERS =====
            case 'upsertUser': {
                await sql`INSERT INTO users (user_id, username, email, plan, remaining_limit, max_limit, has_claimed_free, created_at, updated_at)
                    VALUES (${data.userId}, ${data.username}, ${data.email}, ${data.plan}, ${data.remainingLimit}, ${data.maxLimit}, ${data.hasClaimedFree}, ${now}, ${now})
                    ON CONFLICT (user_id) DO UPDATE SET
                        username = ${data.username},
                        email = ${data.email},
                        plan = ${data.plan},
                        remaining_limit = ${data.remainingLimit},
                        max_limit = ${data.maxLimit},
                        has_claimed_free = ${data.hasClaimedFree},
                        updated_at = ${now}`;
                return res.status(200).json({ success: true });
            }
            case 'getUsers': {
                const rows = await sql`SELECT user_id, username, email, plan, remaining_limit, max_limit, has_claimed_free, created_at, updated_at
                    FROM users ORDER BY updated_at DESC LIMIT 100`;
                return res.status(200).json({ rows: rows.map(r => ({ ...r, created_at: Number(r.created_at), updated_at: Number(r.updated_at) })) });
            }
            case 'getUserByEmail': {
                const rows = await sql`SELECT * FROM users WHERE email = ${data.email} LIMIT 1`;
                return res.status(200).json({ user: rows?.[0] || null });
            }

            // ===== SESSIONS =====
            case 'startSession': {
                await sql`INSERT INTO sessions (session_id, user_id, email, username, login_at, last_seen, is_active, ip_address, user_agent)
                    VALUES (${data.sessionId}, ${data.userId || null}, ${data.email || null}, ${data.username || null}, ${now}, ${now}, TRUE, ${data.ip || null}, ${data.userAgent || null})
                    ON CONFLICT (session_id) DO UPDATE SET last_seen = ${now}, is_active = TRUE`;
                return res.status(200).json({ success: true });
            }
            case 'endSession': {
                await sql`UPDATE sessions SET is_active = FALSE, logout_at = ${now}, last_seen = ${now} WHERE session_id = ${data.sessionId}`;
                return res.status(200).json({ success: true });
            }
            case 'heartbeatSession': {
                await sql`UPDATE sessions SET last_seen = ${now} WHERE session_id = ${data.sessionId} AND is_active = TRUE`;
                return res.status(200).json({ success: true });
            }
            case 'getActiveSessions': {
                const cutoff = now - 5 * 60000;
                const rows = await sql`SELECT session_id, user_id, email, username, login_at, last_seen
                    FROM sessions WHERE is_active = TRUE AND last_seen > ${cutoff}
                    ORDER BY last_seen DESC LIMIT 50`;
                return res.status(200).json({ rows: rows.map(r => ({ ...r, login_at: Number(r.login_at), last_seen: Number(r.last_seen) })) });
            }
            case 'getSessionHistory': {
                const rows = await sql`SELECT session_id, email, username, login_at, logout_at, is_active
                    FROM sessions ORDER BY login_at DESC LIMIT 100`;
                return res.status(200).json({ rows: rows.map(r => ({ ...r, login_at: Number(r.login_at), logout_at: r.logout_at ? Number(r.logout_at) : null })) });
            }

            // ===== ACTIVATIONS =====
            case 'addActivation': {
                await sql`INSERT INTO activations (user_email, package_type, timestamp, date_string, sender_id, session_id, user_id, status, notes)
                    VALUES (${data.user}, ${data.type}, ${data.timestamp}, ${data.dateString}, ${data.sender_id || 'anon'}, ${data.session_id || null}, ${data.user_id || null}, ${data.status || 'success'}, ${data.notes || null})`;
                return res.status(200).json({ success: true });
            }
            case 'getActivations': {
                const rows = await sql`SELECT user_email AS "user", package_type AS "type", timestamp, date_string AS "dateString", sender_id, session_id, status
                    FROM activations ORDER BY timestamp DESC LIMIT 100`;
                return res.status(200).json({ rows: rows.map(r => ({ ...r, timestamp: Number(r.timestamp) })) });
            }

            // ===== REPORTS =====
            case 'addReport': {
                await sql`INSERT INTO reports (category, description, timestamp, date_string, sender_id, user_email, session_id, status)
                    VALUES (${data.category}, ${data.description}, ${data.timestamp}, ${data.date_string}, ${data.sender_id || 'Anonymous'}, ${data.user_email || null}, ${data.session_id || null}, ${data.status || 'open'})`;
                return res.status(200).json({ success: true });
            }
            case 'getReports': {
                const rows = await sql`SELECT category, description, timestamp, date_string, sender_id, user_email, status
                    FROM reports ORDER BY timestamp DESC LIMIT 50`;
                return res.status(200).json({ rows: rows.map(r => ({ ...r, timestamp: Number(r.timestamp) })) });
            }

            // ===== VISITORS (AKURAT) =====
            case 'updatePresence': {
                if (!data.visitorId) return res.status(400).json({ error: 'Missing visitorId' });

                const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;

                // UPSERT: kalau sudah ada, update last_seen + increment total_visits
                // kalau baru, insert baru dengan total_visits = 1
                await sql`INSERT INTO visitors (visitor_id, last_seen, first_seen, user_email, user_agent, ip_address, total_visits)
                    VALUES (${data.visitorId}, ${now}, ${now}, ${data.email || null}, ${data.userAgent || null}, ${ip}, 1)
                    ON CONFLICT (visitor_id) DO UPDATE SET
                        last_seen = ${now},
                        user_email = COALESCE(${data.email || null}, visitors.user_email),
                        total_visits = visitors.total_visits + 1`;

                // Auto-cleanup: hapus visitor yang tidak aktif > 1 jam (biar DB tidak bengkak)
                await sql`DELETE FROM visitors WHERE last_seen < ${now - 3600000}`;

                return res.status(200).json({ success: true });
            }
            case 'getActiveVisitors': {
                // Hanya hitung visitor yang aktif dalam 2 menit terakhir
                const cutoff = now - 120000;
                const rows = await sql`SELECT COUNT(*)::int AS count FROM visitors WHERE last_seen > ${cutoff}`;
                return res.status(200).json({ count: rows?.[0]?.count || 0 });
            }
            case 'getVisitorStats': {
                // Total pengunjung hari ini
                const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
                const dayStart = startOfDay.getTime();
                const rows = await sql`SELECT COUNT(*)::int AS count FROM visitors WHERE first_seen >= ${dayStart}`;
                return res.status(200).json({ todayCount: rows?.[0]?.count || 0 });
            }

            // ===== UPTIME =====
            case 'recordUptime': {
                await sql`INSERT INTO uptime (check_at, status, response_ms, app_version, node_version, region)
                    VALUES (${now}, 'up', ${data.responseMs || 0}, ${data.appVersion || '1.0.0'}, ${process.version}, ${process.env.VERCEL_REGION || 'unknown'})`;
                await sql`DELETE FROM uptime WHERE check_at < ${now - 7 * 86400000}`;
                return res.status(200).json({ success: true });
            }
            case 'getUptimeStats': {
                const since = now - 24 * 3600000;
                const rows = await sql`SELECT COUNT(*)::int AS total, SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END)::int AS up_count
                    FROM uptime WHERE check_at > ${since}`;
                const total = rows?.[0]?.total || 0;
                const upCount = rows?.[0]?.up_count || 0;
                const pct = total > 0 ? ((upCount / total) * 100).toFixed(1) : '100.0';
                return res.status(200).json({ total, upCount, uptimePercentage: pct });
            }

            // ===== PAYMENTS =====
            case 'addPayment': {
                await sql`INSERT INTO payments (user_email, plan_key, plan_label, amount, proof_url, status, timestamp, date_string, session_id, notes)
                    VALUES (${data.userEmail}, ${data.planKey}, ${data.planLabel}, ${data.amount}, ${data.proofUrl || null}, 'pending', ${now}, ${data.dateString || ''}, ${data.sessionId || null}, ${data.notes || null})`;
                return res.status(200).json({ success: true });
            }
            case 'getPayments': {
                const rows = await sql`SELECT user_email, plan_key, plan_label, amount, status, timestamp, date_string
                    FROM payments ORDER BY timestamp DESC LIMIT 50`;
                return res.status(200).json({ rows: rows.map(r => ({ ...r, timestamp: Number(r.timestamp) })) });
            }

            // ===== VOUCHERS =====
            case 'redeemVoucher': {
                const v = await sql`SELECT * FROM vouchers WHERE code = ${data.code} AND used = FALSE LIMIT 1`;
                if (!v || v.length === 0) return res.status(404).json({ success: false, error: 'Voucher tidak valid atau sudah dipakai' });
                const voucher = v[0];
                await sql`UPDATE vouchers SET used = TRUE, used_by = ${data.email}, used_at = ${now} WHERE code = ${data.code}`;
                return res.status(200).json({ success: true, planKey: voucher.plan_key, maxLimit: Number(voucher.max_limit) });
            }
            case 'createVoucher': {
                await sql`INSERT INTO vouchers (code, plan_key, max_limit, used, created_at)
                    VALUES (${data.code}, ${data.planKey}, ${data.maxLimit}, FALSE, ${now})`;
                return res.status(200).json({ success: true });
            }

            default:
                return res.status(400).json({ error: 'Unknown action: ' + action });
        }
    } catch (e) {
        console.error(`DB ${action} error:`, e);
        return res.status(500).json({ error: e.message });
    }
}