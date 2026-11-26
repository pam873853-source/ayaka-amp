import { showToast, appendTerminalLog } from './utils.js';
import { userAccountState, saveUserState } from './user-session.js';
import { neonDb } from './neon-client.js';

let targetUpgradePlan = 'pro';
let pendingPaymentPlan = { key: 'pro', label: 'Plan Pro', price: 'Rp 15.000', limit: 500 };
let paymentProofDataUrl = '';

window.openPlanPaymentModal = function(planKey, label, price, limitVal) {
    if (!userAccountState.isLoggedIn) {
        showToast("Silakan login akun terlebih dahulu sebelum melakukan pembayaran Plan!");
        window.setActiveTab('profil');
        return;
    }
    pendingPaymentPlan = { key: planKey, label, price, limit: limitVal };
    paymentProofDataUrl = '';

    const fileInput = document.getElementById('payment-proof-file');
    const fileNameEl = document.getElementById('payment-proof-filename');
    const previewWrap = document.getElementById('payment-proof-preview-wrap');
    const titleEl = document.getElementById('pay-modal-title');
    const priceEl = document.getElementById('pay-modal-price');

    if (fileInput) fileInput.value = '';
    if (fileNameEl) fileNameEl.textContent = 'Tidak ada ... yang dipilih';
    if (previewWrap) previewWrap.classList.add('hidden');
    if (titleEl) titleEl.textContent = `Pembayaran ${label}`;
    if (priceEl) priceEl.textContent = price;
    setGreenSubmitButtonState(false);

    const modal = document.getElementById('plan-qr-modal');
    const content = document.getElementById('plan-qr-modal-content');
    if (modal && content) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    }
};

window.closePlanPaymentModal = function() {
    const modal = document.getElementById('plan-qr-modal');
    const content = document.getElementById('plan-qr-modal-content');
    if (modal && content) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
};

function setGreenSubmitButtonState(enabled) {
    const btn = document.getElementById('btn-submit-payment-proof');
    if (!btn) return;
    btn.disabled = !enabled;
    if (enabled) {
        btn.classList.remove('opacity-40', 'cursor-not-allowed');
        btn.classList.add('cursor-pointer', 'active:translate-x-[2px]', 'active:translate-y-[2px]');
    } else {
        btn.classList.add('opacity-40', 'cursor-not-allowed');
        btn.classList.remove('cursor-pointer', 'active:translate-x-[2px]', 'active:translate-y-[2px]');
    }
}

window.handlePaymentProofChange = function(event) {
    const file = event?.target?.files?.[0];
    const fileNameEl = document.getElementById('payment-proof-filename');
    const previewWrap = document.getElementById('payment-proof-preview-wrap');
    const previewImg = document.getElementById('payment-proof-preview');

    if (!file) {
        paymentProofDataUrl = '';
        if (fileNameEl) fileNameEl.textContent = 'Tidak ada ... yang dipilih';
        if (previewWrap) previewWrap.classList.add('hidden');
        setGreenSubmitButtonState(false);
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast("Ukuran gambar maksimal 5 MB!");
        event.target.value = '';
        setGreenSubmitButtonState(false);
        return;
    }
    if (fileNameEl) fileNameEl.textContent = file.name;

    const reader = new FileReader();
    reader.onload = function(e) {
        paymentProofDataUrl = e.target?.result || '';
        if (previewImg && previewWrap && paymentProofDataUrl) {
            previewImg.src = paymentProofDataUrl;
            previewWrap.classList.remove('hidden');
        }
        setGreenSubmitButtonState(Boolean(paymentProofDataUrl));
    };
    reader.readAsDataURL(file);
};

window.handleSubmitPaymentProof = async function() {
    if (!paymentProofDataUrl) {
        showToast("Kirim/pilih bukti pembayaran QR terlebih dahulu!");
        setGreenSubmitButtonState(false);
        return;
    }
    userAccountState.plan = pendingPaymentPlan.key;
    userAccountState.maxLimit = pendingPaymentPlan.limit;
    userAccountState.remainingLimit = pendingPaymentPlan.limit;
    saveUserState();

    appendTerminalLog(`Bukti transfer QR diterima untuk ${pendingPaymentPlan.label}. Limit aktif: ${pendingPaymentPlan.limit}.`, "success");

    try {
        await neonDb.addReport({
            category: `Pembayaran ${pendingPaymentPlan.label}`,
            description: `Bukti transfer QR diunggah oleh ${userAccountState.email || userAccountState.username} (${pendingPaymentPlan.price})`,
            timestamp: Date.now(),
            date_string: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID'),
            sender_id: userAccountState.sessionId || 'member'
        });
    } catch (e) { console.error('Report upload failed:', e); }

    window.closePlanPaymentModal();
    showToast(`Bukti pembayaran terkirim! ${pendingPaymentPlan.label} (${pendingPaymentPlan.limit} limit) aktif.`);
    if (window.syncNeonReports) window.syncNeonReports();
};

window.openRedeemModal = function(planType) {
    if (!userAccountState.isLoggedIn) {
        showToast("Silakan login akun terlebih dahulu sebelum mengaktifkan Plan!");
        window.setActiveTab('profil');
        return;
    }
    targetUpgradePlan = planType;
    const modal = document.getElementById('redeem-modal');
    const content = document.getElementById('redeem-modal-content');
    const title = document.getElementById('redeem-modal-title');
    if (title) {
        title.textContent = planType === 'enterprise'
            ? 'Upgrade ke Plan Enterprise (1000 Limit)'
            : 'Upgrade ke Plan Pro (500 Limit)';
    }
    if (modal && content) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    }
};

window.closeRedeemModal = function() {
    const modal = document.getElementById('redeem-modal');
    const content = document.getElementById('redeem-modal-content');
    if (modal && content) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
};

window.handleRedeemPlanCode = function() {
    if (!userAccountState.isLoggedIn) {
        showToast("Silakan login akun terlebih dahulu!");
        window.closeRedeemModal();
        window.setActiveTab('profil');
        return;
    }
    const codeInput = document.getElementById('redeem-code-input');
    const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
    if (!code) { showToast("Masukkan kode lisensi terlebih dahulu!"); return; }

    if (code === 'AYAKAPRO500' || code.startsWith('PRO-')) {
        userAccountState.plan = 'pro';
        userAccountState.maxLimit = 500;
        userAccountState.remainingLimit = 500;
        saveUserState();
        codeInput.value = '';
        window.closeRedeemModal();
        appendTerminalLog("Plan diupgrade ke PRO (500 limit aktif).", "success");
        showToast("Selamat! Plan PRO (500 Limit + Bulk Akun) aktif!");
    } else if (code === 'AYAKAENT1000' || code.startsWith('ENT-')) {
        userAccountState.plan = 'enterprise';
        userAccountState.maxLimit = 1000;
        userAccountState.remainingLimit = 1000;
        saveUserState();
        codeInput.value = '';
        window.closeRedeemModal();
        appendTerminalLog("Plan diupgrade ke ENTERPRISE (1000 limit aktif).", "success");
        showToast("Selamat! Plan ENTERPRISE (1000 Limit + Bulk Akun) aktif!");
    } else {
        showToast("Kode voucher tidak valid! Hubungi admin via WhatsApp.");
    }
};