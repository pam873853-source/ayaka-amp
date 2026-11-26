import { showToast, appendTerminalLog } from './utils.js';
import { neonDb } from './neon-client.js';

export const PLAN_CONFIG = {
    none: { name: 'BELUM LOGIN', maxLimit: 0, canBulk: false },
    free: { name: 'FREE', maxLimit: 20, canBulk: false },
    pro: { name: 'PRO', maxLimit: 500, canBulk: true },
    enterprise: { name: 'ENTERPRISE', maxLimit: 1000, canBulk: true }
};

export let userAccountState = {
    isLoggedIn: false,
    userId: '',
    username: 'Guest User',
    email: '',
    plan: 'none',
    remainingLimit: 0,
    maxLimit: 0,
    hasClaimedFreePlan: false,
    sessionId: '',
    loginTimestamp: Date.now()
};

export function loadUserState() {
    try {
        const saved = localStorage.getItem('ayaka_user_account_v2');
        if (saved) {
            const parsed = JSON.parse(saved);
            userAccountState = { ...userAccountState, ...parsed };
            if (!userAccountState.isLoggedIn) {
                userAccountState.plan = 'none';
                userAccountState.remainingLimit = 0;
                userAccountState.maxLimit = 0;
            } else if (userAccountState.plan === 'free') {
                userAccountState.maxLimit = 20;
                if (typeof userAccountState.remainingLimit !== 'number' || userAccountState.remainingLimit < 0) userAccountState.remainingLimit = 0;
                if (userAccountState.remainingLimit > 20) userAccountState.remainingLimit = 20;
            }
        } else {
            userAccountState.sessionId = 'SES-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            userAccountState.userId = crypto.randomUUID();
            userAccountState.loginTimestamp = Date.now();
            saveUserState();
        }
    } catch (e) { console.error("Load user state error:", e); }
    refreshPlanAndProfileUI();
}

export function saveUserState() {
    try { localStorage.setItem('ayaka_user_account_v2', JSON.stringify(userAccountState)); } catch (e) {}
    refreshPlanAndProfileUI();
}

// Sync user + plan + limit ke Neon DB
export async function syncUserToDB() {
    if (!userAccountState.isLoggedIn || !userAccountState.email) return;
    try {
        await neonDb.upsertUser({
            userId: userAccountState.userId || userAccountState.sessionId,
            username: userAccountState.username,
            email: userAccountState.email,
            plan: userAccountState.plan,
            remainingLimit: userAccountState.remainingLimit,
            maxLimit: userAccountState.maxLimit,
            hasClaimedFree: userAccountState.hasClaimedFreePlan
        });
    } catch (e) { console.error('syncUserToDB:', e); }
}

export function consumeActivationLimit(amount = 1) {
    if (!userAccountState.isLoggedIn || userAccountState.remainingLimit < amount) return false;
    userAccountState.remainingLimit = Math.max(0, userAccountState.remainingLimit - amount);
    saveUserState();
    syncUserToDB().catch(() => {});
    return true;
}

export function ensureUserLoggedInForActivation() {
    if (!userAccountState.isLoggedIn) {
        showToast("Silakan login terlebih dahulu di menu Profil & Sesi untuk mendapatkan Plan Free & melakukan aktivasi!");
        appendTerminalLog("Akses ditolak: Anda belum login. Silakan login dulu untuk mendapatkan Plan Free.", "warn");
        window.setActiveTab('profil');
        return false;
    }
    if (userAccountState.remainingLimit <= 0) {
        showToast("Sisa limit Anda sudah HABIS (0)! Beli Plan Pro atau Enterprise untuk melanjutkan aktivasi.");
        appendTerminalLog("Limit habis (0). Upgrade ke Plan Pro atau Enterprise diperlukan.", "error");
        window.setActiveTab('plan');
        return false;
    }
    return true;
}

export function refreshPlanAndProfileUI() {
    const activePlanKey = userAccountState.isLoggedIn ? (userAccountState.plan || 'free') : 'none';
    const planInfo = PLAN_CONFIG[activePlanKey] || PLAN_CONFIG.none;
    const rem = userAccountState.isLoggedIn ? userAccountState.remainingLimit : 0;
    const max = planInfo.maxLimit;

    const dashPlanBadge = document.getElementById('dash-plan-badge');
    const dashLimitTitle = document.getElementById('dash-limit-title');
    const dashLimitBox = document.getElementById('dash-limit-box');
    const dashUserLabel = document.getElementById('dash-user-label');
    if (dashPlanBadge) dashPlanBadge.textContent = userAccountState.isLoggedIn ? `PLAN ${planInfo.name}` : 'BELUM LOGIN';
    if (dashLimitTitle) dashLimitTitle.textContent = `SISA LIMIT: ${rem} / ${max}`;
    if (dashLimitBox) dashLimitBox.textContent = rem;
    if (dashUserLabel) dashUserLabel.textContent = userAccountState.isLoggedIn
        ? `${userAccountState.username.toUpperCase()} • SESI AKTIF`
        : `LOGIN DULU UNTUK DAPAT PLAN FREE`;

    const sidePlanBadge = document.getElementById('sidebar-plan-badge');
    if (sidePlanBadge) {
        sidePlanBadge.textContent = planInfo.name;
        sidePlanBadge.className = (!userAccountState.isLoggedIn || activePlanKey === 'free')
            ? "text-[9px] font-black bg-zinc-200 border border-black px-1.5 py-0.5 rounded uppercase"
            : "text-[9px] font-black bg-yellow-400 border border-black px-1.5 py-0.5 rounded uppercase";
    }

    const planCurrentName = document.getElementById('plan-current-name');
    const planCurrentRem = document.getElementById('plan-current-remaining');
    const planCurrentMax = document.getElementById('plan-current-max');
    const planProgressBar = document.getElementById('plan-progress-bar');
    if (planCurrentName) planCurrentName.textContent = planInfo.name;
    if (planCurrentRem) planCurrentRem.textContent = rem;
    if (planCurrentMax) planCurrentMax.textContent = max;
    if (planProgressBar) {
        const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((rem / max) * 100))) : 0;
        planProgressBar.style.width = `${pct}%`;
    }

    const bulkAccessBadge = document.getElementById('bulk-access-badge');
    const bulkLockedBox = document.getElementById('bulk-locked-box');
    const bulkUnlockedBox = document.getElementById('bulk-unlocked-box');
    const bulkLimitInfo = document.getElementById('bulk-limit-info');
    if (userAccountState.isLoggedIn && planInfo.canBulk) {
        if (bulkAccessBadge) {
            bulkAccessBadge.textContent = `AKTIF (${planInfo.name})`;
            bulkAccessBadge.className = "text-[10px] font-black uppercase px-2 py-0.5 border border-black rounded bg-emerald-300";
        }
        if (bulkLockedBox) bulkLockedBox.classList.add('hidden');
        if (bulkUnlockedBox) bulkUnlockedBox.classList.remove('hidden');
        if (bulkLimitInfo) bulkLimitInfo.textContent = `Sisa Limit: ${rem} / ${max}`;
    } else {
        if (bulkAccessBadge) {
            bulkAccessBadge.textContent = userAccountState.isLoggedIn ? "TERKUNCI (FREE)" : "WAJIB LOGIN";
            bulkAccessBadge.className = "text-[10px] font-black uppercase px-2 py-0.5 border border-black rounded bg-red-300";
        }
        if (bulkLockedBox) bulkLockedBox.classList.remove('hidden');
        if (bulkUnlockedBox) bulkUnlockedBox.classList.add('hidden');
    }

    const profName = document.getElementById('profile-display-name');
    const profEmail = document.getElementById('profile-display-email');
    const profAvatar = document.getElementById('profile-avatar');
    const profPlanTag = document.getElementById('profile-plan-tag');
    const profLimitTag = document.getElementById('profile-limit-tag');
    const profSessionId = document.getElementById('profile-session-id');
    const profLoginTime = document.getElementById('profile-login-time');
    const profAuthStatus = document.getElementById('profile-auth-status');
    const btnLogout = document.getElementById('btn-logout-session');

    if (profName) profName.textContent = userAccountState.isLoggedIn ? userAccountState.username : 'Guest User (Belum Login)';
    if (profEmail) profEmail.textContent = userAccountState.isLoggedIn ? userAccountState.email : 'Login dulu untuk dapat Plan Free';
    if (profAvatar) profAvatar.textContent = userAccountState.isLoggedIn ? userAccountState.username.charAt(0).toUpperCase() : '👤';
    if (profPlanTag) profPlanTag.textContent = userAccountState.isLoggedIn ? `PLAN ${planInfo.name}` : 'BELUM LOGIN';
    if (profLimitTag) profLimitTag.textContent = `${rem} / ${max} Limit`;
    if (profSessionId) profSessionId.textContent = userAccountState.sessionId || 'SES-GUEST';
    if (profLoginTime) {
        const d = new Date(userAccountState.loginTimestamp || Date.now());
        profLoginTime.textContent = d.toLocaleTimeString('id-ID');
    }
    if (profAuthStatus) {
        profAuthStatus.textContent = userAccountState.isLoggedIn ? 'TERAUTENTIKASI' : 'BELUM LOGIN';
        profAuthStatus.className = userAccountState.isLoggedIn
            ? "text-[10px] font-black uppercase px-2 py-0.5 border border-black rounded bg-emerald-300"
            : "text-[10px] font-black uppercase px-2 py-0.5 border border-black rounded bg-yellow-300";
    }
    if (btnLogout) {
        if (userAccountState.isLoggedIn) { btnLogout.classList.remove('hidden'); btnLogout.classList.add('flex'); }
        else { btnLogout.classList.add('hidden'); btnLogout.classList.remove('flex'); }
    }
}

window.handleRealTimeLogin = async function(e) {
    if (e) e.preventDefault();
    const nameVal = document.getElementById('login-username-input').value.trim();
    const emailVal = document.getElementById('login-email-input').value.trim();
    if (!nameVal || !emailVal) return;

    userAccountState.isLoggedIn = true;
    userAccountState.userId = userAccountState.userId || crypto.randomUUID();
    userAccountState.username = nameVal;
    userAccountState.email = emailVal;
    userAccountState.sessionId = 'SES-' + Date.now().toString(36).toUpperCase();
    userAccountState.loginTimestamp = Date.now();

    if (!userAccountState.hasClaimedFreePlan) {
        userAccountState.plan = 'free';
        userAccountState.maxLimit = 20;
        userAccountState.remainingLimit = 20;
        userAccountState.hasClaimedFreePlan = true;
    } else if (!userAccountState.plan || userAccountState.plan === 'none') {
        userAccountState.plan = 'free';
        userAccountState.maxLimit = 20;
    }

    saveUserState();

    // --- Simpan user ke DB ---
    await syncUserToDB();

    // --- Simpan sesi login ke DB ---
    try {
        await neonDb.startSession({
            sessionId: userAccountState.sessionId,
            userId: userAccountState.userId,
            email: userAccountState.email,
            username: userAccountState.username,
            userAgent: navigator.userAgent
        });
    } catch (err) { console.error('startSession:', err); }

    document.getElementById('login-username-input').value = '';
    document.getElementById('login-email-input').value = '';
    appendTerminalLog(`Sesi login aktif untuk ${nameVal} (${emailVal}). Plan: ${userAccountState.plan.toUpperCase()} | Sisa limit: ${userAccountState.remainingLimit}.`, "success");
    showToast(`Login berhasil! Plan ${userAccountState.plan.toUpperCase()} aktif (${userAccountState.remainingLimit} limit).`);
};

window.handleRealTimeLogout = async function() {
    // --- Akhiri sesi di DB ---
    try {
        if (userAccountState.sessionId) await neonDb.endSession(userAccountState.sessionId);
    } catch (err) { console.error('endSession:', err); }

    userAccountState.isLoggedIn = false;
    userAccountState.username = 'Guest User';
    userAccountState.email = '';
    userAccountState.plan = 'none';
    userAccountState.maxLimit = 0;
    userAccountState.sessionId = 'SES-GUEST-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    userAccountState.loginTimestamp = Date.now();
    saveUserState();
    appendTerminalLog("Sesi logout. Login kembali untuk menggunakan aktivasi & Plan Free.", "warn");
    showToast("Sesi logout berhasil. Silakan login kembali untuk menggunakan aktivasi.");
};