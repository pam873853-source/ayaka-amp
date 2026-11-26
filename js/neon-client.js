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

    async upsertUser(userData) { return dbCall('upsertUser', userData); }
    async getUsers() { try { return (await dbCall('getUsers')).rows || []; } catch { return []; } }
    async getUserByEmail(email) { try { return (await dbCall('getUserByEmail', { email })).user; } catch { return null; } }

    async startSession(sessionData) { return dbCall('startSession', sessionData); }
    async endSession(sessionId) { return dbCall('endSession', { sessionId }); }
    async heartbeatSession(sessionId) { return dbCall('heartbeatSession', { sessionId }); }
    async getActiveSessions() { try { return (await dbCall('getActiveSessions')).rows || []; } catch { return []; } }
    async getSessionHistory() { try { return (await dbCall('getSessionHistory')).rows || []; } catch { return []; } }

    async addActivation(logData) { return dbCall('addActivation', logData); }
    async getActivations() { try { return (await dbCall('getActivations')).rows || []; } catch { return []; } }

    async addReport(reportData) { return dbCall('addReport', reportData); }
    async getReports() { try { return (await dbCall('getReports')).rows || []; } catch { return []; } }

    async updatePresence(visitorId, email = null) {
        return dbCall('updatePresence', { visitorId, email, userAgent: navigator.userAgent });
    }
    async getActiveVisitors() {
        try {
            const res = await dbCall('getActiveVisitors');
            return res.count;
        } catch { return null; }
    }
    async getVisitorStats() {
        try { return await dbCall('getVisitorStats'); }
        catch { return { todayCount: 0 }; }
    }

    async recordUptime(responseMs = 0) {
        return dbCall('recordUptime', { responseMs, appVersion: '1.0.0' });
    }
    async getUptimeStats() {
        try { return await dbCall('getUptimeStats'); }
        catch { return { total: 0, upCount: 0, uptimePercentage: '100.0' }; }
    }

    async addPayment(paymentData) { return dbCall('addPayment', paymentData); }
    async getPayments() { try { return (await dbCall('getPayments')).rows || []; } catch { return []; } }

    async redeemVoucher(code, email) { return dbCall('redeemVoucher', { code, email }); }
    async createVoucher(voucherData) { return dbCall('createVoucher', voucherData); }
}

export const neonDb = new NeonClient();