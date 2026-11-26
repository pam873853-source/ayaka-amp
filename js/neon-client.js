async function dbCall(action, data = {}) {
    const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data })
    });
    if (!res.ok) throw new Error(`DB ${action} failed: ${res.status}`);
    return res.json();
}

export class NeonClient {
    isConfigured() { return true; }
    async addActivation(logData) { await dbCall('addActivation', logData); }
    async getActivations() {
        try { const r = await dbCall('getActivations'); return r.rows || []; }
        catch (e) { console.error('getActivations:', e); return []; }
    }
    async addReport(reportData) { await dbCall('addReport', reportData); }
    async getReports() {
        try { const r = await dbCall('getReports'); return r.rows || []; }
        catch (e) { console.error('getReports:', e); return []; }
    }
    async updatePresence(visitorId) { await dbCall('updatePresence', { visitorId }); }
    async getActiveVisitors() {
        try { const r = await dbCall('getActiveVisitors'); return r.count; }
        catch (e) { console.error('getActiveVisitors:', e); return null; }
    }
}

export const neonDb = new NeonClient();