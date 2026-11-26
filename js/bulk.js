import { showToast } from './utils.js';
import { userAccountState, PLAN_CONFIG, consumeActivationLimit, ensureUserLoggedInForActivation } from './user-session.js';

window.handleGenerateBulkAccount = async function() {
    if (!ensureUserLoggedInForActivation()) return;
    const planInfo = PLAN_CONFIG[userAccountState.plan] || PLAN_CONFIG.free;
    if (!planInfo.canBulk) {
        showToast("Fitur Bulk Akun hanya untuk Plan Pro & Enterprise!");
        window.setActiveTab('plan');
        return;
    }
    if (userAccountState.remainingLimit <= 0) {
        showToast("Sisa limit Anda 0! Silakan perpanjang Plan Anda.");
        window.setActiveTab('plan');
        return;
    }
    const orderIdInput = document.getElementById('bulk-order-id');
    const orderId = orderIdInput ? orderIdInput.value.trim() : '';
    if (!orderId) { showToast("Masukkan Order ID terlebih dahulu!"); return; }

    const btn = document.getElementById('btn-generate-bulk');
    const resSection = document.getElementById('bulk-results-section');
    const resList = document.getElementById('bulk-results-list');
    const runtimeBadge = document.getElementById('bulk-runtime-badge');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Sedang Generate Akun...`;
    }

    try {
        const response = await fetch('/api/bulk-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (data && data.status && data.result && Array.isArray(data.result.result)) {
            const accounts = data.result.result;
            const countGenerated = accounts.length || 1;
            consumeActivationLimit(countGenerated);

            if (runtimeBadge) runtimeBadge.textContent = data.time || 'OK';
            if (resSection) resSection.classList.remove('hidden');
            if (resList) {
                resList.innerHTML = accounts.map(acc => `
                    <div class="neo-card p-3.5 bg-white space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-300 border border-black rounded">${acc.type || 'PREMIUM'}</span>
                            <span class="text-[10px] font-mono font-bold text-gray-500">${acc.status || 'success'}</span>
                        </div>
                        <div class="p-2.5 bg-zinc-100 border-2 border-black rounded-lg font-mono text-xs font-black break-all">
                            ${acc.account || acc.email}
                        </div>
                        <div class="text-[10px] font-mono text-gray-600 truncate">
                            Order ID: <b>${acc.orderId || orderId}</b>
                        </div>
                        <div class="grid grid-cols-2 gap-2 pt-1">
                            <button type="button" onclick="copyTextValue('${(acc.account || acc.email).replace(/'/g, "\\'")}')" class="neo-btn py-2 text-[10px] flex items-center justify-center gap-1">
                                <i class="fa-solid fa-copy"></i> Salin Akun
                            </button>
                            <a href="${acc.login_url || '#'}" target="_blank" class="neo-btn-yellow py-2 text-[10px] flex items-center justify-center gap-1">
                                <i class="fa-solid fa-envelope-open-text"></i> Buka Inbox
                            </a>
                        </div>
                    </div>
                `).join('');
            }
            showToast(`Berhasil generate ${countGenerated} akun premium!`);
        } else {
            throw new Error("Respon API tidak valid atau gagal.");
        }
    } catch (err) {
        console.error("Bulk generate error:", err);
        showToast("Gagal generate bulk akun: " + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Bulk Akun Sekarang`;
        }
    }
};