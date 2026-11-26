let cachedConfig = null;

export async function loadConfig() {
    if (cachedConfig) return cachedConfig;
    try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        cachedConfig = await res.json();
    } catch (e) {
        console.error('loadConfig failed:', e);
        cachedConfig = { appId: 'ayaka-motion-default', firebaseConfig: {} };
    }
    return cachedConfig;
}