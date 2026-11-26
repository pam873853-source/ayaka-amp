export function showToast(msg) {
    const toast = document.getElementById('toast-notif');
    const msgEl = document.getElementById('toast-message');
    if (!toast || !msgEl) return;
    msgEl.textContent = msg;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => toast.classList.add('opacity-0', 'pointer-events-none'), 2500);
}

export function copyTextValue(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast("Disalin ke clipboard!");
}

export function appendTerminalLog(message, type = 'info') {
    const term = document.getElementById('activation-terminal-log');
    if (!term) return;
    const now = new Date();
    const timeStamp = now.toLocaleTimeString('id-ID', { hour12: false });
    let colorClass = 'text-emerald-400';
    let prefix = 'INFO';
    if (type === 'warn') { colorClass = 'text-amber-300'; prefix = 'WARN'; }
    else if (type === 'error') { colorClass = 'text-rose-400'; prefix = 'ERR '; }
    else if (type === 'success') { colorClass = 'text-yellow-300'; prefix = 'OK  '; }
    const line = document.createElement('div');
    line.className = `${colorClass} break-words`;
    line.textContent = `[${timeStamp}] [${prefix}] ${message}`;
    term.appendChild(line);
    term.scrollTop = term.scrollHeight;
}

export function clearActivationTerminal() {
    const term = document.getElementById('activation-terminal-log');
    if (!term) return;
    term.innerHTML = `<div class="text-zinc-400">[SYSTEM] Log terminal dibersihkan. Siap memantau...</div>`;
}

window.showToast = showToast;
window.copyTextValue = copyTextValue;
window.clearActivationTerminal = clearActivationTerminal;