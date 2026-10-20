# Deploying Hatian to Hostinger (`hatian.jkleonardo.tech`)

Everything is pre-built and packaged for your Hostinger subdomain and MySQL database:
- **Subdomain URL**: `https://hatian.jkleonardo.tech`
- **Hostinger Folder**: `/home/u962919458/domains/jkleonardo.tech/public_html/hatian`
- **MySQL Database**: `u962919458_hatian`
- **MySQL Username**: `u962919458_hatian`

---

## Step 1: Import the Database in Hostinger phpMyAdmin

1. In your Hostinger hPanel, go to **Databases → MySQL Databases**.
2. Click **Enter phpMyAdmin** next to `u962919458_hatian`.
3. Click the **Import** tab at the top.
4. Choose the file [`database/hatian_mysql_schema.sql`](file:///d:/Projects/Personal%20Projects/hatian/database/hatian_mysql_schema.sql) from this project.
5. Click **Import** (or **Go**) at the bottom. All required tables (`users`, `hatians`, `sessions`, `cache`, `jobs`, `migrations`) will be created immediately.

---

## Step 2: Upload & Extract `hatian-hostinger-deploy.zip`

1. In Hostinger hPanel, open **Files → File Manager**.
2. Navigate to:
   ```text
   /domains/jkleonardo.tech/public_html/hatian
   ```
   *(If there is a default `default.php` file inside `hatian`, delete it first.)*
3. Upload [`hatian-hostinger-deploy.zip`](file:///d:/Projects/Personal%20Projects/hatian/hatian-hostinger-deploy.zip) into `/domains/jkleonardo.tech/public_html/hatian`.
4. Right-click `hatian-hostinger-deploy.zip` → click **Extract** → enter `.` (current folder) as the destination.
5. Delete `hatian-hostinger-deploy.zip` from the server once extracted.

---

### Important Note for Hostinger Proxies & 419 Fix:
The package is pre-configured with:
- **`$middleware->trustProxies(at: '*')`** in `bootstrap/app.php` so Laravel correctly handles SSL termination behind Hostinger's proxy.
- **`SESSION_DRIVER=file`** in `.env` to prevent session loss.
- **`SESSION_DOMAIN=null`** so cookies are host-only without subdomain rejection.
- Explicit CSRF tokens embedded in all forms & Inertia requests.

---

## Step 3: Set Your MySQL Password in `.env`

1. Inside `/domains/jkleonardo.tech/public_html/hatian`, check if `.env` exists. If not, copy or rename `.env.production` to `.env`.
2. Open `.env` and replace `PASTE_YOUR_MYSQL_PASSWORD_HERE` with the actual password you created for `u962919458_hatian`:
   ```ini
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=u962919458_hatian
   DB_USERNAME=u962919458_hatian
   DB_PASSWORD="your-actual-mysql-password"
   ```
3. Save the file.

---

## Step 4: Verify with Built-in Diagnostic Tool

Visit: **`https://hatian.jkleonardo.tech/diagnose`**

This diagnostic page immediately checks:
- MySQL database connectivity (green/red)
- Whether `.env` still has the placeholder password
- Whether all tables (`hatians`, `users`, `sessions`, `cache`) exist
- Whether `receipt_images` column exists
- If anything is missing, a **"Run Migrations"** button is provided right on the page to fix it with 1 click!
- Displays the latest lines from `storage/logs/laravel.log` so you can diagnose any issue immediately.

---

## Optional: If Deploying via SSH / Git Instead of ZIP

If you use SSH on Hostinger instead of the ZIP upload:
```bash
cd /home/u962919458/domains/jkleonardo.tech/public_html/hatian
cp .env.production .env
# Edit .env with your DB_PASSWORD
php artisan migrate --force
php artisan optimize
```

