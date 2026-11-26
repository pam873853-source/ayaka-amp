import { neon } from '@neondatabase/serverless';

const sql = process.env.NEON_DATABASE_URL ? neon(process.env.NEON_DATABASE_URL) : null;
let tablesInitialized = false;

async function ensureTables() {
    if (!sql || tablesInitialized) return;
    await sql`CREATE TABLE IF NOT EXISTS activations (
        id SERIAL PRIMARY KEY,
        user_email TEXT NOT NULL,
        package_type TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        date_string TEXT,
        sender_id TEXT
    )`;
    await sql`CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        date_string TEXT,
        sender_id TEXT
    )`;
    await sql`CREATE TABLE IF NOT EXISTS visitors (
        visitor_id TEXT PRIMARY KEY,
        last_seen BIGINT NOT NULL
    )`;
    tablesInitialized = true;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!sql) return res.status(503).json({ error: 'Database not configured' });

    await ensureTables();
    const { action, data = {} } = req.body || {};

    try {
        switch (action) {
            case 'addActivation': {
                await sql`INSERT INTO activations (user_email, package_type, timestamp, date_string, sender_id)
                    VALUES (${data.user}, ${data.type}, ${data.timestamp}, ${data.dateString}, ${data.sender_id || 'anon'})`;
                return res.status(200).json({ success: true });
            }
            case 'getActivations': {
                const rows = await sql`SELECT user_email AS "user", package_type AS "type", timestamp, date_string AS "dateString", sender_id
                    FROM activations ORDER BY timestamp DESC LIMIT 100`;
                return res.status(200).json({ rows: rows.map(r => ({ ...r, timestamp: Number(r.timestamp) })) });
            }
            case 'addReport': {
                await sql`INSERT INTO reports (category, description, timestamp, date_string, sender_id)
                    VALUES (${data.category}, ${data.description}, ${data.timestamp}, ${data.date_string}, ${data.sender_id || 'Anonymous'})`;
                return res.status(200).json({ success: true });
            }
            case 'getReports': {
                const rows = await sql`SELECT category, description, timestamp, date_string, sender_id
                    FROM reports ORDER BY timestamp DESC LIMIT 50`;
                return res.status(200).json({ rows: rows.map(r => ({ ...r, timestamp: Number(r.timestamp) })) });
            }
            case 'updatePresence': {
                const now = Date.now();
                await sql`INSERT INTO visitors (visitor_id, last_seen) VALUES (${data.visitorId}, ${now})
                    ON CONFLICT (visitor_id) DO UPDATE SET last_seen = ${now}`;
                return res.status(200).json({ success: true });
            }
            case 'getActiveVisitors': {
                const cutoff = Date.now() - 60000;
                const rows = await sql`SELECT COUNT(*)::int AS count FROM visitors WHERE last_seen > ${cutoff}`;
                return res.status(200).json({ count: rows?.[0]?.count || 1 });
            }
            default:
                return res.status(400).json({ error: 'Unknown action' });
        }
    } catch (e) {
        console.error(`DB ${action} error:`, e);
        return res.status(500).json({ error: e.message });
    }
}