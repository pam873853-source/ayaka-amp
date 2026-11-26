import { showToast, appendTerminalLog } from './utils.js';
import { userAccountState, saveUserState, syncUserToDB } from './user-session.js';
import { neonDb } from './neon-client.js';

let targetUpgradePlan = 'pro';
let pendingPaymentPlan = { key: 'pro', label: 'Plan Pro', price: 'Rp 35.000', limit: 500 };
let paymentProofDataUrl = '';

// =======================================================
// MODAL PEMBAYARAN QR
// =======================================================
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

// =======================================================
// HANDLE UPLOAD BUKTI PEMBAYARAN
// =======================================================
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

// =======================================================
// SUBMIT BUKTI TRANSFER → Simpan ke tabel `payments`
// =======================================================
window.handleSubmitPaymentProof = async function() {
    if (!paymentProofDataUrl) {
        showToast("Kirim/pilih bukti pembayaran QR terlebih dahulu!");
        setGreenSubmitButtonState(false);
        return;
    }

    const btn = document.getElementById('btn-submit-payment-proof');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Mengirim...`;
    }

    try {
        // Simpan bukti transfer ke tabel `payments` (status: pending)
        await neonDb.addPayment({
            userEmail: userAccountState.email,
            planKey: pendingPaymentPlan.key,
            planLabel: pendingPaymentPlan.label,
            amount: pendingPaymentPlan.price,
            proofUrl: paymentProofDataUrl ? paymentProofDataUrl.substring(0, 500) : null, // ambil prefix base64 saja
            dateString: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID'),
            sessionId: userAccountState.sessionId || null,
            notes: `Upgrade ke ${pendingPaymentPlan.label} (${pendingPaymentPlan.limit} limit)`
        });

        // Aktifkan plan langsung (mode otomatis — admin bisa verifikasi manual di DB)
        userAccountState.plan = pendingPaymentPlan.key;
        userAccountState.maxLimit = pendingPaymentPlan.limit;
        userAccountState.remainingLimit = pendingPaymentPlan.limit;
        saveUserState();

        // Sync user plan ke DB
        await syncUserToDB();

        appendTerminalLog(
            `Bukti transfer diterima untuk ${pendingPaymentPlan.label}. Limit aktif: ${pendingPaymentPlan.limit}.`,
            "success"
        );

        showToast(`Bukti pembayaran terkirim! ${pendingPaymentPlan.label} (${pendingPaymentPlan.limit} limit) aktif.`);
        window.closePlanPaymentModal();

        // Refresh report (kalau ada sync)
        if (window.syncNeonReports) window.syncNeonReports();
    } catch (e) {
        console.error('Submit payment proof error:', e);
        showToast("Gagal kirim bukti pembayaran: " + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Kirim Bukti Transfer`;
            setGreenSubmitButtonState(false);
        }
    }
};

// =======================================================
// MODAL REDEEM VOUCHER
// =======================================================
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
    const input = document.getElementById('redeem-code-input');

    if (title) {
        title.textContent = planType === 'enterprise'
            ? 'Upgrade ke Plan Enterprise (1000 Limit)'
            : 'Upgrade ke Plan Pro (500 Limit)';
    }
    if (input) input.value = '';

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

// =======================================================
// REDEEM VOUCHER → Validasi ke tabel `vouchers`
// =======================================================
window.handleRedeemPlanCode = async function() {
    if (!userAccountState.isLoggedIn) {
        showToast("Silakan login akun terlebih dahulu!");
        window.closeRedeemModal();
        window.setActiveTab('profil');
        return;
    }

    const codeInput = document.getElementById('redeem-code-input');
    const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
    if (!code) {
        showToast("Masukkan kode lisensi terlebih dahulu!");
        return;
    }

    const btn = document.querySelector('#redeem-modal-content button[onclick="handleRedeemPlanCode()"]');
    const originalBtnText = btn?.innerHTML;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Memverifikasi...`;
    }

    try {
        // Validasi voucher langsung ke tabel `vouchers` di Neon DB
        const res = await neonDb.redeemVoucher(code, userAccountState.email);

        if (res && res.success) {
            userAccountState.plan = res.planKey;
            userAccountState.maxLimit = res.maxLimit;
            userAccountState.remainingLimit = res.maxLimit;
            saveUserState();

            // Sync plan baru ke tabel users
            await syncUserToDB();

            if (codeInput) codeInput.value = '';
            window.closeRedeemModal();

            appendTerminalLog(
                `Voucher ${code} berhasil di-redeem. Plan: ${res.planKey.toUpperCase()} (${res.maxLimit} limit).`,
                "success"
            );
            showToast(`Selamat! Plan ${res.planKey.toUpperCase()} aktif (${res.maxLimit} limit)!`);
        } else {
            appendTerminalLog(`Voucher ${code} gagal: ${res?.error || 'Tidak valid'}`, "error");
            showToast(res?.error || "Kode voucher tidak valid atau sudah dipakai!");
        }
    } catch (e) {
        console.error('Redeem voucher error:', e);
        showToast("Gagal redeem voucher: " + e.message);
    } finally {
        if (btn && originalBtnText) {
            btn.disabled = false;
            btn.innerHTML = originalBtnText;
        }
    }
};