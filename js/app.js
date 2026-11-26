import { loadConfig } from './config.js';
import { pingPresence } from './firebase.js';
import { loadUserState } from './user-session.js';
import { syncNeonActivations, syncNeonReports } from './data.js';
import { initUI } from './ui.js';
import { neonDb } from './neon-client.js';

// Import untuk side-effect (attach ke window)
import './utils.js';
import './plan.js';
import './amp-api.js';
import './bulk.js';
import './ai-chat.js';

(async function bootstrap() {
    let config;
    try {
        config = await loadConfig();
    } catch (e) {
        console.error('Bootstrap config load failed:', e);
        config = { appId: 'ayaka-motion-default', firebaseConfig: {} };
    }
    window.__config = config;

    // Init "firebase" (sekarang hanya generate userId lokal)
    await pingPresence();

    // Presence via Neon
    let visitorId = window.__userId || crypto.randomUUID();
    window.__userId = visitorId;

    const pingNeon = async () => {
        try {
            await neonDb.updatePresence(visitorId);
            const count = await neonDb.getActiveVisitors();
            if (typeof count === 'number') {
                const { setTotalVisitors } = await import('./data.js');
                setTotalVisitors(Math.max(1, count));
            }
        } catch (e) { /* silent */ }
    };
    await pingNeon();
    setInterval(pingNeon, 12000);

    // User state
    loadUserState();

    // Sinkron data dari Neon
    try { await syncNeonActivations(); } catch (e) { console.error(e); }
    try { await syncNeonReports(); } catch (e) { console.error(e); }
    setInterval(() => {
        syncNeonActivations().catch(() => {});
        syncNeonReports().catch(() => {});
    }, 8000);

    initUI();
})();