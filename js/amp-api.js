import { showToast, appendTerminalLog } from './utils.js';
import { userAccountState, consumeActivationLimit, ensureUserLoggedInForActivation } from './user-session.js';
import { neonDb } from './neon-client.js';

let verifiedEmailTemp = '';

window.switchActivationStep = function(step) {
    const step1 = document.getElementById('neo-step-1');
    const step2 = document.getElementById('neo-step-2');
    const btn1 = document.getElementById('tab-btn-kirim');
    const btn2 = document.getElementById('tab-btn-verifikasi');
    if (!step1 || !step2 || !btn1 || !btn2) return;
    if (step === 1) {
        step1.classList.remove('hidden');
        step2.classList.add('hidden');
        btn1.className = "neo-btn-dark py-2.5 text-xs flex items-center justify-center gap-2";
        btn2.className = "neo-btn py-2.5 text-xs flex items-center justify-center gap-2";
    } else {
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
        btn1.className = "neo-btn py-2.5 text-xs flex items-center justify-center gap-2";
        btn2.className = "neo-btn-dark py-2.5 text-xs flex items-center justify-center gap-2";
    }
};

window.handleSendMagicLink = async function() {
    if (!ensureUserLoggedInForActivation()) return;
    const email = document.getElementById('amp-email').value.trim();
    if (!email) {
        showToast("Masukkan email terlebih dahulu!");
        appendTerminalLog("Validasi gagal: Alamat Gmail masih kosong.", "warn");
        return;
    }
    const btn = document.getElementById('btn-send-link');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Mengirim...`;
    appendTerminalLog(`Mengirim permintaan Magic Link ke ${email}...`, "info");

    try {
        const res = await fetch('/api/send-magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) {
            verifiedEmailTemp = email;
            appendTerminalLog(`Magic Link berhasil dikirim ke ${email}. Lanjut ke Langkah 2 (Verifikasi).`, "success");
            showToast("Magic Link berhasil dikirim ke email!");
            window.switchActivationStep(2);
        } else {
            appendTerminalLog(`Gagal mengirim Magic Link ke ${email}: ${data.error}`, "error");
            showToast("Gagal: " + data.error);
        }
    } catch (err) {
        appendTerminalLog(`Gagal mengirim Magic Link: ${err.message}`, "error");
        showToast("Gagal: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Kirim Magic Link ke Email`;
    }
};

window.handleVerifyAndApply = async function() {
    if (!ensureUserLoggedInForActivation()) return;
    const email = verifiedEmailTemp || document.getElementById('amp-email').value.trim();
    const link = document.getElementById('amp-magic-link').value.trim();
    const pkg = document.getElementById('amp-package').value;
    if (!email || !link) {
        showToast("Email dan Magic Link wajib diisi!");
        appendTerminalLog("Validasi gagal: Email atau Magic Link/oobCode belum diisi.", "warn");
        return;
    }
    const btn = document.getElementById('btn-verify-apply');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Memproses...`;
    appendTerminalLog(`Memverifikasi token & mengaktifkan paket (${pkg}) untuk ${email}...`, "info");

    try {
        const res = await fetch('/api/verify-apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, link, productId: pkg })
        });
        const data = await res.json();
        if (data.success) {
            consumeActivationLimit(1);
            appendTerminalLog(`Aktivasi SUKSES untuk ${email}! Sisa limit tersisa: ${userAccountState.remainingLimit}.`, "success");
            showToast(`Akun Berhasil Diaktifkan! Sisa limit: ${userAccountState.remainingLimit}`);
            const todayStr = new Date().toDateString();
            const logData = {
                user: email,
                type: pkg.includes('annual') ? '1 Tahun Premium' : '1 Bulan Premium',
                timestamp: Date.now(),
                dateString: todayStr,
                sender_id: userAccountState.sessionId || 'anon'
            };
            try { await neonDb.addActivation(logData); } catch (e) { console.error('Neon add:', e); }
            document.getElementById('amp-email').value = '';
            document.getElementById('amp-magic-link').value = '';
            window.switchActivationStep(1);
            if (window.syncNeonActivations) window.syncNeonActivations();
        } else {
            appendTerminalLog(`Verifikasi gagal untuk ${email}: ${data.error}`, "error");
            showToast("Gagal: " + data.error);
        }
    } catch (err) {
        appendTerminalLog(`Verifikasi gagal: ${err.message}`, "error");
        showToast("Gagal: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-bolt"></i> Verifikasi & Aktifkan Sekarang`;
    }
};