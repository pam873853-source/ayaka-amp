const HEADERS = {
    "Content-Type": "application/json",
    "X-Android-Package": "com.alightcreative.motion",
    "X-Android-Cert": "ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8",
    "User-Agent": "Mozilla/5.0 (Linux; Android 15; Mobile)"
};

function extractOobCode(fullUrl) {
    if (!fullUrl) return null;
    try {
        let cleanUrl = fullUrl.replace(/&amp;/g, '&');
        try { cleanUrl = decodeURIComponent(cleanUrl); } catch (e) {}
        const match = cleanUrl.match(/[?&]oobCode=([a-zA-Z0-9_-]+)/i) || cleanUrl.match(/oobCode=([a-zA-Z0-9_-]+)/i);
        if (match && match[1]) return match[1];
        return cleanUrl.trim();
    } catch (e) { return fullUrl.trim(); }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const { email, link, productId } = req.body || {};
    if (!email || !link || !productId) return res.status(400).json({ success: false, error: 'Missing fields' });

    const API_KEY = process.env.AM_API_KEY;
    const TOKEN = process.env.AM_TOKEN;
    const FIREBASE_INSTANCE_ID_TOKEN = process.env.AM_FIREBASE_INSTANCE_ID_TOKEN;
    const ORDER_ID = process.env.AM_ORDER_ID || 'GPA';
    const SKU_TYPE = process.env.AM_SKU_TYPE || 'subs';

    if (!API_KEY || !TOKEN) return res.status(503).json({ success: false, error: 'AM config missing' });

    try {
        const oobCode = extractOobCode(link);
        if (!oobCode) throw new Error("Gagal mengekstrak oobCode.");

        const signinRes = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/emailLinkSignin?key=${API_KEY}`, {
            method: 'POST', headers: HEADERS,
            body: JSON.stringify({ email, oobCode, clientType: "CLIENT_TYPE_ANDROID" })
        });
        const signinData = await signinRes.json();
        if (!signinRes.ok || !signinData.idToken) throw new Error("Verifikasi Token Gagal");

        const codeorder = Math.floor(10000 + Math.random() * 90000).toString();
        const purchaseRes = await fetch('https://us-central1-alight-creative.cloudfunctions.net/verifyPurchase', {
            method: 'POST',
            headers: {
                "authorization": "Bearer " + signinData.idToken,
                "firebase-instance-id-token": FIREBASE_INSTANCE_ID_TOKEN,
                "content-type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({
                data: {
                    productId: productId,
                    token: TOKEN,
                    skuType: SKU_TYPE,
                    orderId: ORDER_ID + "-" + codeorder
                }
            })
        });
        if (!purchaseRes.ok) throw new Error("Gagal menerapkan pembelian premium");
        return res.status(200).json({ success: true });
    } catch (e) {
        console.error('verifyAndApply error:', e);
        return res.status(500).json({ success: false, error: e.message });
    }
}