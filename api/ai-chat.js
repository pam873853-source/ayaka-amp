export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { text, sessionId } = req.body || {};
    if (!text) return res.status(400).json({ error: 'Missing text' });

    const base = process.env.AI_GEMINI_BASE_URL || 'https://api.ikyyxd.my.id/ai/gemini';
    const url = `${base}?text=${encodeURIComponent(text)}&sessionsId=${encodeURIComponent(sessionId || 'Ayaka Sync')}`;

    try {
        const r = await fetch(url);
        const data = await r.json();
        return res.status(200).json(data);
    } catch (e) {
        console.error('AI chat error:', e);
        return res.status(500).json({ status: false, error: e.message });
    }
}