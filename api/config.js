export default function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({
        appId: process.env.APP_ID || 'ayaka-motion-default',
        firebaseConfig: {}
    });
}