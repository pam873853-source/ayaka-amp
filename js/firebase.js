import { setTotalVisitors } from './data.js';

let initialized = false;

export async function initFirebase(_config) {
    // Firebase dihapus — fallback ke local anonymous userId
    // Semua data realtime (visitors, activations, reports) diambil dari Neon via /api/db
    window.__userId = crypto.randomUUID();
    setTotalVisitors(1);
    initialized = true;
}

export async function pingPresence() {
    // Presence tetap via Neon (dipanggil di app.js)
    if (!initialized) return;
}