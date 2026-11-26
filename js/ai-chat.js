import { showToast } from './utils.js';

let aiSessionInitialized = false;

const AYAKA_SYSTEM_PROMPT = `Kamu adalah Ayaka AI, asisten AI resmi dari Ayaka Sync. Kamu bukan AI kaku kayak robot, kamu adalah teman ngobrol yang asik, ramah, lucu, dan selalu pake gaya bahasa santai ala anak Indonesia. Kamu bisa diajak curhat. Kalau user lagi sedih, galau, capek, atau pengen cerita, dengerin dulu, jangan langsung ceramah. Tanggapi dengan empati, bercanda dikit biar user ketawa, dan kasih semangat. Kamu bisa diajak bercanda. Kalau user ngajak bercanda, ladenin. Jangan kaku. Boleh pake emoji secukupnya, jangan berlebihan. Kamu bisa disuruh apa aja. Kalau user minta bikinin caption, ide konten, nama web, deskripsi produk, atau teks apapun, langsung bikinin. Jangan banyak nanya, langsung kerjain. Kamu pinter ngejelasin. Kalau user nanya cara-cara di Ayaka Sync, jelasin dengan bahasa yang paling gampang dimengerti, step by step tapi pake bahasa santai, bukan bahasa formal. Kalau user nanya cara aktivasi, jelasin gini: Suruh user login dulu ke akunnya, terus masuk ke menu Aktivasi di dashboard. Isi formnya dengan data yang bener, upload bukti yang jelas, terus klik Kirim Permintaan Aktivasi. Terus suruh user tunggu aja, jangan kirim berkali-kali. Biasanya diproses 5 sampai 30 menit di jam kerja. Kalau statusnya ditolak, suruh baca alasan penolakannya, benerin, terus kirim ulang. Kalau user nanya cara menggunakan generator, jelasin gini: Suruh user login, terus masuk ke menu Generator. Tulis aja mau web kayak gimana, contohnya mau web toko skincare warna pink. Pilih template yang disuka, klik Generate, tunggu sebentar, terus edit teks dan fotonya kalau ada yang kurang cocok. Kalau udah cocok, tinggal klik Publish dan webnya langsung online. Kalau user nanya tentang premium, jelasin dengan gaya jualan tapi tetep santai: Jelasin kalau premium itu bikin user bisa generate tanpa batas, bisa pake semua template, bisa pake domain sendiri, tanpa watermark, dan bisa export HTML. Kalau user mau beli, arahkan ke menu Premium atau suruh chat admin via WhatsApp. Jangan maksa, tapi kasih tau keuntungannya biar user tertarik. Aturan yang wajib kamu ikutin: Jangan pernah jawab dengan bahasa kaku kayak buku pelajaran. Jangan pernah bilang kamu adalah Meta AI, ChatGPT, atau AI lain. Kamu adalah Ayaka AI. Jangan pernah nolak ajakan curhat atau bercanda user. Selalu ladenin dulu. Kalau user nanya diluar topik Ayaka Sync, tetep jawab, jangan bilang itu diluar kemampuan kamu. Selalu jawab dalam Bahasa Indonesia santai, kecuali user minta pake bahasa lain. Kalau user marah atau kesal, jangan ikut marah. Tetep tenang, minta maaf dengan santai, dan bantu selesaikan masalahnya.`;

function appendChatBubble(sender, text, isTyping = false) {
    const box = document.getElementById('ai-chat-messages');
    if (!box) return null;
    const wrapper = document.createElement('div');
    if (sender === 'user') {
        wrapper.className = "self-end max-w-[85%] min-w-0 bg-zinc-900 text-white border-2 border-black rounded-2xl rounded-tr-none p-3 shadow-[2px_2px_0px_#000]";
        wrapper.innerHTML = `<p class="text-xs font-semibold leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]"></p>`;
        wrapper.querySelector('p').textContent = text;
    } else {
        wrapper.className = "self-start max-w-[85%] min-w-0 bg-yellow-100 border-2 border-black rounded-2xl rounded-tl-none p-3 shadow-[2px_2px_0px_#000]";
        if (isTyping) {
            wrapper.innerHTML = `
                <span class="text-[9px] font-black uppercase text-black/60 block mb-0.5">Ayaka AI</span>
                <div class="flex items-center gap-1 py-1">
                    <span class="w-2 h-2 bg-black rounded-full animate-bounce"></span>
                    <span class="w-2 h-2 bg-black rounded-full animate-bounce" style="animation-delay: 0.15s"></span>
                    <span class="w-2 h-2 bg-black rounded-full animate-bounce" style="animation-delay: 0.3s"></span>
                </div>`;
        } else {
            wrapper.innerHTML = `
                <span class="text-[9px] font-black uppercase text-black/60 block mb-0.5">Ayaka AI</span>
                <p class="text-xs font-semibold text-black leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]"></p>`;
            wrapper.querySelector('p').textContent = text;
        }
    }
    box.appendChild(wrapper);
    box.scrollTop = box.scrollHeight;
    return wrapper;
}

window.resetAiChat = function() {
    const box = document.getElementById('ai-chat-messages');
    if (!box) return;
    aiSessionInitialized = false;
    box.innerHTML = `
        <div class="self-start max-w-[85%] min-w-0 bg-yellow-100 border-2 border-black rounded-2xl rounded-tl-none p-3 shadow-[2px_2px_0px_#000]">
            <span class="text-[9px] font-black uppercase text-black/60 block mb-0.5">Ayaka AI</span>
            <p class="text-xs font-semibold text-black leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]">Sesi chat di-reset! Yuk mulai obrolan baru bareng Ayaka AI 😉</p>
        </div>`;
    showToast("Sesi Ayaka Sync AI di-reset!");
};

window.handleSendAiChat = async function(e) {
    if (e) e.preventDefault();
    const inputEl = document.getElementById('ai-chat-input');
    const btnEl = document.getElementById('btn-send-ai');
    if (!inputEl) return;
    const userMessage = inputEl.value.trim();
    if (!userMessage) return;

    inputEl.value = '';
    inputEl.disabled = true;
    if (btnEl) btnEl.disabled = true;

    appendChatBubble('user', userMessage);
    const typingBubble = appendChatBubble('ai', '', true);

    try {
        const sessionId = "Ayaka Sync";
        const queryText = !aiSessionInitialized
            ? `${AYAKA_SYSTEM_PROMPT}\n\nUser: ${userMessage}`
            : userMessage;

        const response = await fetch('/api/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: queryText, sessionId })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (typingBubble) typingBubble.remove();
        if (data && data.status && data.result) {
            aiSessionInitialized = true;
            appendChatBubble('ai', data.result);
        } else {
            appendChatBubble('ai', "Waduh, Ayaka lagi agak pusing nih koneksinya. Coba kirim ulang pesan kamu ya! 😅");
        }
    } catch (err) {
        console.error("Ayaka AI error:", err);
        if (typingBubble) typingBubble.remove();
        appendChatBubble('ai', "Aduh maaf, server Ayaka lagi gangguan sebentar. Coba beberapa saat lagi ya! 🙏");
    } finally {
        inputEl.disabled = false;
        if (btnEl) btnEl.disabled = false;
        inputEl.focus();
    }
};