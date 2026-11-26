import { showToast } from './utils.js';
import { neonDb } from './neon-client.js';

export let historyLogs = [];
export let reportsLogs = [];
export let totalVisitors = 0;
let realTimeChart = null;

export function setHistoryLogs(logs) {
    historyLogs = logs;
    historyLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    updateCounts();
    if (!document.getElementById('view-riwayat')?.classList.contains('hidden')) renderHistory();
}

export function setReportsLogs(logs) {
    reportsLogs = logs;
    renderReports();
}

export function setTotalVisitors(n) {
    totalVisitors = Math.max(0, Number(n) || 0);
    const el = document.getElementById('visitors-count');
    if (el) el.textContent = totalVisitors;
}

export function renderHistory() {
    const container = document.getElementById('history-feed-container');
    if (!container) return;
    if (!historyLogs || historyLogs.length === 0) {
        container.innerHTML = `
            <div class="neo-card p-8 text-center space-y-2 bg-white">
                <i class="fa-solid fa-box-open text-3xl text-gray-400"></i>
                <p class="text-xs font-black">Belum Ada Riwayat Aktivasi</p>
            </div>`;
        return;
    }
    container.innerHTML = historyLogs.map(item => `
        <div class="neo-card p-3.5 flex items-center justify-between bg-white">
            <div>
                <p class="text-xs font-black">${item.user}</p>
                <p class="text-[10px] font-bold text-gray-500">${item.type}</p>
            </div>
            <span class="px-2.5 py-1 bg-emerald-400 border-2 border-black rounded-lg text-[10px] font-black">AKTIF</span>
        </div>`).join('');
}

export function renderReports() {
    const container = document.getElementById('reports-list-container');
    const badge = document.getElementById('reports-count-badge');
    if (!container) return;
    if (badge) badge.textContent = (reportsLogs ? reportsLogs.length : 0) + " Laporan";
    if (!reportsLogs || reportsLogs.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-400 font-bold text-center py-4">Belum ada laporan tersimpan.</p>`;
        return;
    }
    container.innerHTML = reportsLogs.map(item => `
        <div class="neo-card p-3 bg-zinc-50 border-2 border-black space-y-1">
            <div class="flex items-center justify-between">
                <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-yellow-300 border border-black">${item.category}</span>
                <span class="text-[9px] font-mono font-bold text-gray-500">${item.date_string || ''}</span>
            </div>
            <p class="text-xs font-semibold text-black break-words pt-1">${item.description}</p>
        </div>`).join('');
}

export function updateCounts() {
    const countActivations = historyLogs.length;
    const actEl = document.getElementById('activations-count');
    const actTotalEl = document.getElementById('act-total-count');
    const actTodayEl = document.getElementById('act-today-count');

    if (actEl) actEl.textContent = countActivations;
    if (actTotalEl) actTotalEl.textContent = countActivations;

    const todayStr = new Date().toDateString();
    const todayCount = historyLogs.filter(h => h.dateString === todayStr || h.date_string?.includes(todayStr)).length;
    if (actTodayEl) actTodayEl.textContent = todayCount;

    const visitorsEl = document.getElementById('visitors-count');
    if (visitorsEl) visitorsEl.textContent = totalVisitors;

    updateChartData();
}

export function initActivationChart() {
    const canvas = document.getElementById('activation-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (realTimeChart) { realTimeChart.destroy(); realTimeChart = null; }
    const ctx = canvas.getContext('2d');
    const hoursLabels = [];
    const dataCounts = [0, 0, 0, 0, 0, 0];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const h = new Date(now.getTime() - i * 3600000);
        hoursLabels.push(h.getHours().toString().padStart(2, '0') + ':00');
    }
    if (historyLogs && historyLogs.length > 0) {
        historyLogs.forEach(log => {
            const logTime = log.timestamp || Date.now();
            const diffHours = Math.floor((now.getTime() - logTime) / 3600000);
            if (diffHours >= 0 && diffHours < 6) dataCounts[5 - diffHours]++;
        });
    }
    realTimeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hoursLabels,
            datasets: [{
                label: 'Aktivasi', data: dataCounts,
                borderColor: '#000000', backgroundColor: 'rgba(250, 204, 21, 0.4)',
                borderWidth: 3, fill: true, tension: 0.3,
                pointBackgroundColor: '#facc15', pointBorderColor: '#000000',
                pointBorderWidth: 2, pointRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { font: { weight: 'bold', size: 10 }, color: '#000' } },
                y: { beginAtZero: true, ticks: { precision: 0, font: { weight: 'bold', size: 10 }, color: '#000' }, grid: { color: 'rgba(0,0,0,0.1)' } }
            }
        }
    });
}

export function updateChartData() {
    if (!realTimeChart) return;
    const now = new Date();
    const dataCounts = [0, 0, 0, 0, 0, 0];
    if (historyLogs && historyLogs.length > 0) {
        historyLogs.forEach(log => {
            const logTime = log.timestamp || Date.now();
            const diffHours = Math.floor((now.getTime() - logTime) / 3600000);
            if (diffHours >= 0 && diffHours < 6) dataCounts[5 - diffHours]++;
        });
    }
    realTimeChart.data.datasets[0].data = dataCounts;
    realTimeChart.update('none');
}

export async function syncNeonActivations() {
    const neonData = await neonDb.getActivations();
    if (neonData && neonData.length >= 0) {
        historyLogs = neonData;
        historyLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        updateCounts();
        if (!document.getElementById('view-riwayat')?.classList.contains('hidden')) renderHistory();
    }
}

export async function syncNeonReports() {
    const neonReports = await neonDb.getReports();
    if (neonReports && neonReports.length >= 0) {
        reportsLogs = neonReports;
        renderReports();
    }
}

window.clearHistoryFeed = function() {
    if (confirm("Hapus seluruh riwayat lokal?")) {
        historyLogs = [];
        renderHistory();
        updateCounts();
        showToast("Riwayat dibersihkan.");
    }
};

window.submitBugReport = async function() {
    const category = document.getElementById('report-category').value;
    const description = document.getElementById('report-description').value.trim();
    if (!description) { showToast("Mohon isi deskripsi kendala/saran terlebih dahulu!"); return; }
    const btn = document.getElementById('btn-submit-report');
    if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Menyimpan...`; }
    const reportData = {
        category: category,
        description: description,
        timestamp: Date.now(),
        date_string: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID'),
        sender_id: window.__userId || 'Anonymous'
    };
    try {
        await neonDb.addReport(reportData);
        document.getElementById('report-description').value = '';
        showToast("Laporan/Saran berhasil disimpan ke Database Neon Tech!");
        await syncNeonReports();
    } catch (e) {
        showToast("Gagal menyimpan laporan: " + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-database"></i> Kirim & Simpan Laporan ke Neon DB`; }
    }
};

window.syncNeonActivations = syncNeonActivations;
window.syncNeonReports = syncNeonReports;
window.updateCounts = updateCounts;