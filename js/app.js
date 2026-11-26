import { loadConfig } from './config.js';
import { loadUserState, userAccountState } from './user-session.js';
import { syncNeonActivations, syncNeonReports, setTotalVisitors } from './data.js';
import { initUI } from './ui.js';
import { neonDb } from './neon-client.js';

import './utils.js';
import './plan.js';
import './amp-api.js';
import './bulk.js';
import './ai-chat.js';

(async function bootstrap() {
    let config;
    try { config = await loadConfig(); }
    catch (e) { console.error('loadConfig failed:', e); config = { appId: 'ayaka-motion-default' }; }
    window.__config = config;

    if (!window.__userId) window.__userId = crypto.randomUUID();

    // ----- UPTIME: catat saat app load -----
    const t0 = performance.now();
    try { await neonDb.recordUptime(Math.round(performance.now() - t0)); }
    catch (e) { console.error('recordUptime:', e); }

    // ----- Presence -----
    const pingPresence = async () => {
        try {
            await neonDb.updatePresence(window.__userId, userAccountState.email || null);
            const count = await neonDb.getActiveVisitors();
            if (typeof count === 'number') setTotalVisitors(Math.max(1, count));
        } catch (e) { /* silent */ }
    };
    await pingPresence();

    // ----- User state -----
    loadUserState();

    // ----- Sinkron data awal -----
    try { await syncNeonActivations(); } catch (e) {}
    try { await syncNeonReports(); } catch (e) {}

    // ----- Uptime widget (24h) -----
    async function refreshUptimeBadge() {
        try {
            const stats = await neonDb.getUptimeStats();
            const el = document.getElementById('server-uptime-pct');
            if (el) el.textContent = `${stats.uptimePercentage}%`;
        } catch (e) {}
    }
    refreshUptimeBadge();

    // ----- Periodic jobs -----
    setInterval(pingPresence, 12000);                                 // presence 12s
    setInterval(refreshUptimeBadge, 60000);                           // uptime widget 60s
    setInterval(() => neonDb.recordUptime(0).catch(() => {}), 60000); // record uptime 60s
    setInterval(() => {
        syncNeonActivations().catch(() => {});
        syncNeonReports().catch(() => {});
    }, 8000);                                                          // data sync 8s
    setInterval(() => {
        // heartbeat sesi aktif
        if (userAccountState.isLoggedIn && userAccountState.sessionId) {
            neonDb.heartbeatSession(userAccountState.sessionId).catch(() => {});
        }
    }, 30000);                                                          // session heartbeat 30s

    initUI();
})();