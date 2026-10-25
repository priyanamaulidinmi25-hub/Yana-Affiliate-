# YANA AFFILIATE - WEB CATALOG & ADMIN PANEL

Website katalog showcase produk affiliate mobile-first terinspirasi dari tampilan TikTok Shop. Dibangun menggunakan **HTML5, CSS3, Vanilla JavaScript (ES6 Modules)**, dan backend serverless **Firebase Web SDK v10 (Modular)**.

---

## 🛠️ Tech Stack & Arsitektur
- **Frontend**: Native HTML, CSS (Mobile-First 2-Column Grid), ES6 JavaScript Modules.
- **Backend Services**:
  - **Firebase Authentication**: Login Email/Password khusus Admin.
  - **Cloud Firestore**: Database NoSQL realtime (`products`, `categories`, `settings`).
  - **Firebase Storage**: Media bucket untuk foto produk dan logo brand.
- **Hosting**: Netlify Static Hosting.
- **No Build Tools**: Tanpa Node.js, Webpack, Vite, atau framework tambahan. Langsung jalan di browser Acode Android.

---

## 📁 Struktur File Proyek
```text
yana-affiliate/
├── index.html             # Halaman Utama Katalog Publik
├── product.html           # Halaman Detail Produk Publik
├── admin.html             # Halaman Panel Admin & Login
├── netlify.toml           # Konfigurasi Routing Netlify & Security Headers
├── firestore.rules        # Security Rules Cloud Firestore (UID Locked)
├── storage.rules          # Security Rules Firebase Storage (MIME & Size Limit)
├── README.md              # Dokumentasi Proyek
├── css/
│   ├── style.css          # CSS Utama Publik (TikTok Shop Style)
│   ├── product.css        # CSS Detail Produk
│   └── admin.css          # CSS Panel Admin Dashboard
└── js/
    ├── firebase-config.js # Inisialisasi Firebase Web SDK v10
    ├── firebase-public.js # Data Service Layer Firestore Realtime
    ├── app.js             # Controller Halaman Katalog Publik
    ├── product-detail.js  # Controller Halaman Detail Produk
    ├── admin-auth.js      # Controller Otentikasi Admin
    ├── admin-products.js  # Controller CRUD Produk Admin & Storage
    ├── admin-categories.js# Controller CRUD Kategori & Relasi
    └── admin-settings.js  # Controller Pengaturan Brand & Logo
