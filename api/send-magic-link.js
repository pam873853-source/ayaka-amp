const HEADERS = {
    "Content-Type": "application/json",
    "X-Android-Package": "com.alightcreative.motion",
    "X-Android-Cert": "ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8",
    "User-Agent": "Mozilla/5.0 (Linux; Android 15; Mobile)"
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, error: 'Missing email' });

    const API_KEY = process.env.AM_API_KEY;
    if (!API_KEY) return res.status(503).json({ success: false, error: 'AM API not configured' });

    try {
        await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/createAuthUri?key=${API_KEY}`, {
            method: 'POST', headers: HEADERS,
            body: JSON.stringify({ identifier: email, continueUri: "http://localhost" })
        });

        const r = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobConfirmationCode?key=${API_KEY}`, {
            method: 'POST', headers: HEADERS,
            body: JSON.stringify({
                requestType: 6,
                email: email,
                androidInstallApp: true,
                canHandleCodeInApp: true,
                continueUrl: "https://alightcreative.com",
                androidPackageName: "com.alightcreative.motion",
                clientType: "CLIENT_TYPE_ANDROID"
            })
        });
        if (!r.ok) throw new Error(await r.text());
        return res.status(200).json({ success: true });
    } catch (e) {
        console.error('sendMagicLink error:', e);
        return res.status(500).json({ success: false, error: e.message });
    }
}