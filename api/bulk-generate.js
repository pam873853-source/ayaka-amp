export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

    const base = process.env.BULK_API_BASE_URL || 'https://api.izzxd.my.id/api/am/bulk-custom';
    const apikey = process.env.BULK_API_KEY || 'ayakasync';
    const url = `${base}?orderId=${encodeURIComponent(orderId)}&apikey=${encodeURIComponent(apikey)}`;

    try {
        const r = await fetch(url);
        const data = await r.json();
        return res.status(200).json(data);
    } catch (e) {
        console.error('Bulk generate error:', e);
        return res.status(500).json({ status: false, error: e.message });
    }
}