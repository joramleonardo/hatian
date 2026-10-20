# Hatian — Smart Group Order, Pasabuy & Barkada Bill Splitter

> **Hatian** *(Tagalog for "sharing" / "splitting")* is a modern, transparent, and mobile-friendly group expense and bill-splitting web application built for the real-world friction of barkada dining, GrabFood / Foodpanda group orders, overseas pasabuys, and shared group trips.

---

## The Problem Hatian Solves

When one person in the group pays for an online order (e.g. GrabFood, Foodpanda, Shopee Pasabuy), splitting the final bill fairly is usually messy:
- **Promo vouchers** (e.g. "₱150 OFF" or "20% OFF min. ₱600") are often divided arbitrarily, penalizing the friend who only ordered a drink or letting big orders reap all the savings.
- **Delivery & service fees** are tedious to distribute manually.
- Friends constantly ask in group chats: *"Magkano akin?"*, *"Saan pwede mag-bayad?"*, or *"Bayad na ba si ganito?"*.

**Hatian solves all of this automatically in seconds—with zero sign-up required.**

---

## Features

### 1. Fair & Transparent Mathematical Breakdown
- **Proportional Group Discounts:** Automatically distributes percentage or fixed-amount discounts across orders based on each person's spend.
- **Delivery & Service Fee Splitting:** Easily split fees equally or proportionally, or assign specific fees to chosen participants.
- **Multi-Currency Support:** Handles foreign currencies (JPY, USD, SGD, KRW, EUR, etc.) with custom exchange rates for travel and overseas pasabuys.

### 2. Zero Signup Barrier (Guest First)
- Anyone can build, calculate, and generate a shareable link in seconds without creating an account.
- Guest creators can edit, duplicate, or delete their splits through a secure, cookie-stored edit token.

### 3. Order Receipt Uploads
- Payers can attach up to **5 order receipt screenshots** (GrabFood summaries, restaurant bills, POS slips).
- Friends viewing the link can inspect the full high-res receipt directly on the page to verify item prices and promotional discounts.

### 4. Multi-Channel Payment Hub & QR Codes
- Display payment details for popular Philippine digital banks and wallets:
  - **GCash**
  - **Maya**
  - **GoTyme**
  - **Maribank**
  - **Landbank**
  - **BPI**
  - **BDO**
  - **UnionBank**
  - **Cash**
- One-tap account number copy and built-in **Scan / Download QR Code** modal.

### 5. Mobile-Friendly "Mark as Paid" with Required Proof
- Friends marking their share as paid are **required to attach a payment screenshot** (GCash/Maya confirmation slip).
- Features client-side image compression for instantaneous uploads even on mobile cellular networks.
- An interactive **"View Proof"** viewer lets anyone verify payment screenshots and download them.

### 6. Optional User Accounts & Dashboard History
- Users who register or log in automatically **claim and save all previous guest splits** created on their device.
- Full dashboard with aggregate settlement analytics: total volume, active collectibles, and discount savings.
- Save default payment methods and QR codes so new splits pre-fill automatically.

### 7. Aesthetic & Responsive UI
- Crafted with the **"Burnt Ochre & Midnight Teal"** theme (`#D95D28` primary, `#0C2D37` petrol, `#FBF8F3` warm bone).
- Fully responsive design optimized for mobile viewports, tablets, and desktop.
- Complete Light & Dark mode support.

---

## Tech Stack

- **Backend:** Laravel 11 (PHP 8.2+)
- **Frontend:** React 19 with TypeScript
- **Adapter:** Inertia.js v2 (Single Page Application UX without client-side routing complexity)
- **Styling:** Tailwind CSS v4 with Radix UI and Lucide React
- **Database:** MySQL (Production) / SQLite (Local development & testing)
- **Image Processing:** Client-side canvas compression (`compressImageToDataUrl`)

---

## Getting Started (Local Development)

### Prerequisites
- **PHP** >= 8.2 (with `pdo`, `mbstring`, `fileinfo`, `gd`, `openssl`)
- **Composer** >= 2.x
- **Node.js** >= 18.x & **npm**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/joramleonardo/hatian.git
   cd hatian
   ```

2. **Install PHP dependencies:**
   ```bash
   composer install
   ```

3. **Install JavaScript dependencies:**
   ```bash
   npm install
   ```

4. **Environment setup:**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

5. **Run database migrations:**
   ```bash
   touch database/database.sqlite
   php artisan migrate
   ```

6. **Start local development servers:**
   ```bash
   # Terminal 1: Laravel backend
   php artisan serve

   # Terminal 2: Vite hot-reload
   npm run dev
   ```

7. Open your browser and visit: **`http://localhost:8000`**

---

## Running Tests

Hatian includes an automated test suite covering guest split creation, public link rendering, payment proof uploads, calculation accuracy, and authentication claim flows:

```bash
php artisan test
```

---

## Production Deployment (Hostinger / cPanel)

Hatian is pre-configured for shared hosting environments (such as Hostinger):
- **Deployment Guide:** See [`DEPLOY_HOSTINGER.md`](./DEPLOY_HOSTINGER.md) for full step-by-step instructions.
- **Pre-packaged Schema:** Ready-to-import MySQL script available at [`database/hatian_mysql_schema.sql`](./database/hatian_mysql_schema.sql).
- **Update Script:** Quick incremental update script at [`database/update_hostinger_database.sql`](./database/update_hostinger_database.sql).
- **Self-Healing Diagnostics:** Hatian includes a built-in diagnostic route at `/diagnose` to check MySQL connectivity, verify tables, and trigger migrations directly through the browser.

---

## License

This project is open-source software licensed under the [MIT License](LICENSE).
