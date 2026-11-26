# 🚀 AYAKA MOTION - Activation Console

Web app untuk aktivasi Alight Motion Premium otomatis, dengan AI chat, bulk generator, plan/limit system, dan dashboard Neo-Brutalism.

## 📁 Struktur Project

```
├── api/                 → Vercel Serverless Functions (API proxy)
├── css/                 → Styles
├── js/                  → Modular JavaScript (ES Modules)
├── images/              → Asset gambar (QR code)
├── index.html           → Entry point
├── vercel.json
├── package.json
├── .env.example
└── README.md
```

## 🛠️ Setup Lokal

### 1. Prasyarat
- Node.js 18+
- Akun [Vercel](https://vercel.com)
- Akun [Neon Tech](https://neon.tech) (Postgres)
- Project [Firebase](https://console.firebase.google.com) (Realtime DB)

### 2. Install

```bash
git clone <repo-url>
cd ayaka-motion
npm install
npm install -g vercel
```

### 3. Setup Environment Variables

Copy `.env.example` ke `.env.local`:

```bash
cp .env.example .env.local
```

Lalu isi semua variable dengan credentials Anda:

| Variable | Deskripsi |
|----------|-----------|
| `FIREBASE_*` | Config Web App Firebase |
| `NEON_DATABASE_URL` | Connection string Postgres Neon |
| `AM_API_KEY` | Alight Motion / Google Identity API key |
| `AM_TOKEN` | Purchase token Alight Motion |
| `AM_FIREBASE_INSTANCE_ID_TOKEN` | Firebase Instance ID token |
| `BULK_API_KEY` | API key bulk generator |
| `AI_GEMINI_BASE_URL` | Endpoint AI chat |

### 4. Siapkan Asset Gambar

Taruh file berikut di folder `images/`:
- `ayaka-store.png` → QR Code support/payment
- `ayaka-sync-qr.png` → QR Code pembayaran Plan (fallback ke `ayaka-store.png`)

### 5. Run Local

```bash
vercel dev
```

Buka `http://localhost:3000`

## ☁️ Deploy ke Vercel

```bash
vercel
vercel --prod
```

Atau connect repo ke Vercel Dashboard, lalu set Environment Variables di **Project Settings → Environment Variables**.

## 🔒 Keamanan

- Semua API key **hanya** ada di serverless functions (`/api/*`)
- Frontend hanya menerima Firebase config (public) via `/api/config`
- Neon DB diakses via `/api/db` proxy (bukan dari browser)
- AM token, bulk API key, AI key semuanya server-side

## 🎨 Fitur

- ✅ Magic Link activation flow (kirim + verifikasi)
- ✅ Plan / Limit system (Free 20, Pro 500, Enterprise 1000)
- ✅ Bulk Account Generator (Pro & Enterprise only)
- ✅ Ayaka Sync AI Chat (Gemini)
- ✅ Real-time Dashboard (Firestore snapshot + Neon)
- ✅ Real-time chart aktivasi 6 jam terakhir
- ✅ Live FPS tracker, latency, battery, uptime
- ✅ Neo-Brutalism UI + animated space background
- ✅ Report bugs (tersimpan di Neon DB)
- ✅ Redeem voucher code

## 🧪 Testing Redeem Code

| Kode | Plan |
|------|------|
| `AYAKAPRO500` atau `PRO-*` | Plan Pro (500 limit) |
| `AYAKAENT1000` atau `ENT-*` | Plan Enterprise (1000 limit) |

## 📝 Notes

- Login dulu di tab **Profil & Sesi** sebelum aktivasi (dapat Plan Free 20 limit)
- Data user disimpan di `localStorage` (key: `ayaka_user_account_v2`)
- Semua laporan & aktivasi tersimpan di Neon Postgres
- Firestore digunakan untuk realtime listeners (optional, fallback ke Neon)

## 📞 Support

WhatsApp: [wa.me/6285888116002](https://wa.me/6285888116002)