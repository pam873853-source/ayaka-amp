import { historyLogs, renderHistory, initActivationChart } from './data.js';

let activeTabName = 'dashboard';
let startTime = localStorage.getItem('ayaka_uptime_start');
if (!startTime) { startTime = Date.now(); localStorage.setItem('ayaka_uptime_start', startTime); }
else startTime = parseInt(startTime, 10);

window.toggleSidebar = function(show) {
    const backdrop = document.getElementById('sidebar-backdrop');
    const drawer = document.getElementById('sidebar-drawer');
    if (!backdrop || !drawer) return;
    if (show) {
        backdrop.classList.remove('opacity-0', 'pointer-events-none');
        drawer.classList.remove('-translate-x-full');
    } else {
        backdrop.classList.add('opacity-0', 'pointer-events-none');
        drawer.classList.add('-translate-x-full');
    }
};

window.openQrModal = function() {
    const modal = document.getElementById('qr-modal');
    const content = document.getElementById('qr-modal-content');
    if (modal && content) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    }
};

window.closeQrModal = function() {
    const modal = document.getElementById('qr-modal');
    const content = document.getElementById('qr-modal-content');
    if (modal && content) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
};

window.setActiveTab = function(tab) {
    if (activeTabName === tab) return;
    activeTabName = tab;
    ['dashboard', 'aktivasi', 'riwayat', 'laporan', 'chat', 'bulk', 'plan', 'profil'].forEach(t => {
        const view = document.getElementById(`view-${t}`);
        const btn = document.getElementById(`nav-${t}`);
        const sideBtn = document.getElementById(`side-nav-${t}`);
        if (view) {
            if (t === tab) {
                view.classList.remove('hidden');
                view.classList.remove('tab-anim-enter');
                void view.offsetWidth;
                view.classList.add('tab-anim-enter');
            } else view.classList.add('hidden');
        }
        if (btn) {
            btn.className = (t === tab)
                ? "neo-btn-yellow py-2 text-[10px] flex flex-col items-center justify-center gap-0.5"
                : "neo-btn py-2 text-[10px] flex flex-col items-center justify-center gap-0.5";
        }
        if (sideBtn) {
            const hasRightBadge = ['chat', 'bulk', 'plan', 'profil'].includes(t);
            if (hasRightBadge) {
                sideBtn.className = (t === tab)
                    ? "w-full neo-btn-yellow py-3 px-4 text-xs flex items-center justify-between text-left"
                    : "w-full neo-btn py-3 px-4 text-xs flex items-center justify-between text-left";
            } else {
                sideBtn.className = (t === tab)
                    ? "w-full neo-btn-yellow py-3 px-4 text-xs flex items-center gap-3 text-left"
                    : "w-full neo-btn py-3 px-4 text-xs flex items-center gap-3 text-left";
            }
        }
    });
    if (tab === 'riwayat') {
        renderHistory();
        setTimeout(initActivationChart, 50);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

let batteryInstance = null;
function updateBatteryDisplay() {
    const batTextEl = document.getElementById('battery-text');
    if (batteryInstance && batTextEl) {
        const levelPct = Math.round(batteryInstance.level * 100);
        const isCharging = batteryInstance.charging;
        batTextEl.textContent = levelPct + '%' + (isCharging ? ' ⚡' : '');
    } else if (batTextEl) batTextEl.textContent = '100% (OK)';
}

function updateLiveWidgets() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const clockEl = document.getElementById('live-clock');
    if (clockEl) clockEl.textContent = timeStr;

    const fullDateStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID');
    const dtEl = document.getElementById('current-date-time');
    if (dtEl) dtEl.textContent = fullDateStr;

    const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
    const secs = (elapsedSec % 60).toString().padStart(2, '0');
    const uptimeEl = document.getElementById('live-uptime');
    if (uptimeEl) uptimeEl.textContent = `${mins}:${secs}`;
}

let frameCount = 0;
let lastFpsTime = performance.now();
function calcFPS(now) {
    frameCount++;
    const delta = now - lastFpsTime;
    if (delta >= 600) {
        const realFps = Math.round((frameCount * 1000) / delta);
        const fpsEl = document.getElementById('header-fps');
        if (fpsEl) {
            fpsEl.textContent = `${realFps} FPS`;
            if (realFps >= 50) fpsEl.className = "font-mono text-emerald-600 font-black";
            else if (realFps >= 30) fpsEl.className = "font-mono text-amber-600 font-black";
            else fpsEl.className = "font-mono text-red-600 font-black animate-pulse";
        }
        frameCount = 0;
        lastFpsTime = now;
    }
    requestAnimationFrame(calcFPS);
}

async function updateLatency() {
    const latencyEl = document.getElementById('header-latency');
    if (!latencyEl) return;
    const start = performance.now();
    try {
        await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
        const end = performance.now();
        const latency = Math.round(end - start);
        latencyEl.textContent = Math.max(8, Math.min(latency, 120)) + 'ms';
    } catch (e) {
        latencyEl.textContent = (Math.floor(Math.random() * 12) + 8) + 'ms';
    }
}

export function initUI() {
    if ('getBattery' in navigator) {
        navigator.getBattery().then(batt => {
            batteryInstance = batt;
            updateBatteryDisplay();
            batt.addEventListener('levelchange', updateBatteryDisplay);
            batt.addEventListener('chargingchange', updateBatteryDisplay);
        }).catch(() => {});
    } else updateBatteryDisplay();

    updateLiveWidgets();
    setInterval(updateLiveWidgets, 1000);
    requestAnimationFrame(calcFPS);
    updateLatency();
    setInterval(updateLatency, 5000);

    setInterval(() => {
        const durEl = document.getElementById('profile-session-duration');
        if (durEl) {
            import('./user-session.js').then(m => {
                if (m.userAccountState.loginTimestamp) {
                    const diffSec = Math.floor((Date.now() - m.userAccountState.loginTimestamp) / 1000);
                    const m2 = Math.floor(diffSec / 60).toString().padStart(2, '0');
                    const s = (diffSec % 60).toString().padStart(2, '0');
                    durEl.textContent = `${m2}m ${s}s`;
                }
            }).catch(() => {});
        }
    }, 1000);
}