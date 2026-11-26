(async function bootstrap() {
    let config;
    try { config = await loadConfig(); }
    catch (e) { console.error('loadConfig failed:', e); config = { appId: 'ayaka-motion-default' }; }
    window.__config = config;

    // =========================================================
    // PERBAIKAN: Simpan visitorId di localStorage
    // =========================================================
    let visitorId = localStorage.getItem('ayaka_visitor_id');
    if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem('ayaka_visitor_id', visitorId);
    }
    window.__userId = visitorId;

    // ----- UPTIME: catat saat app load -----
    const t0 = performance.now();
    try { await neonDb.recordUptime(Math.round(performance.now() - t0)); }
    catch (e) { console.error('recordUptime:', e); }

    // ----- Presence (Ping setiap 12 detik) -----
    const pingPresence = async () => {
        try {
            // Jika sudah login, kirim emailnya juga
            const email = localStorage.getItem('ayaka_user_account_v2') 
                ? JSON.parse(localStorage.getItem('ayaka_user_account_v2')).email 
                : null;
                
            await neonDb.updatePresence(window.__userId, email);
            
            // Ambil data pengunjung terbaru dari DB
            const count = await neonDb.getActiveVisitors();
            if (typeof count === 'number') {
                setTotalVisitors(Math.max(0, count)); // Bisa 0 jika hanya kamu yang buka dan blm ping
            }
        } catch (e) { /* silent */ }
    };
    
    // Panggil pertama kali, lalu ulangi tiap 12 detik
    await pingPresence();
    setInterval(pingPresence, 12000);

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