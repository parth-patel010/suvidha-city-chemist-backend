# Suvidha Pharmacy Pro – Full Hosting Guide

This guide explains how to run the app locally and how to host it in production (database, backend, frontend, and optional AI service).

---

## Table of Contents

1. [Stack Overview](#stack-overview)
2. [Prerequisites](#prerequisites)
3. [Local Development](#local-development)
4. [Environment Variables](#environment-variables)
5. [Database Setup (PostgreSQL)](#database-setup-postgresql)
6. [Production Build](#production-build)
7. [Hosting Options](#hosting-options)
8. [Option A: Single VPS (Ubuntu)](#option-a-single-vps-ubuntu)
9. [Option B: Railway](#option-b-railway)
10. [Option C: Render](#option-c-render)
11. [Post-Deploy Checklist](#post-deploy-checklist)
12. [Default Credentials & Security](#default-credentials--security)

---

## Stack Overview

| Component      | Tech              | Port (local) | Purpose                    |
|----------------|-------------------|--------------|----------------------------|
| Backend + API  | Node.js / Express | 5000         | REST API, auth, serve app  |
| Frontend       | React + Vite       | (same as backend) | SPA (built and served by backend in production) |
| Database       | PostgreSQL         | -            | Neon, Supabase, or any Postgres |
| AI microservice| Python / Flask     | 8000         | Demand forecast, expiry risk, etc. (optional) |

In production you run one Node process; it serves the built frontend and the API. The AI service is optional and can run on the same server or a separate one.

---

## Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.10+ and **pip** (only if you run the AI service)
- **PostgreSQL** (local or cloud, e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), or self-hosted)
- **Git** (for cloning and deploy)

---

## Local Development

### Windows

```batch
run.bat
```

This will:

- Set UTF-8 and call `run_main.bat`
- Check Node, npm, Python, pip
- Install Node and (optionally) AI deps from `requirements.txt` (root or `ai-service/`)
- Load `.env` and run schema push + seed if `DATABASE_URL` is set
- Start the AI service (if present) and then `npm run dev` (backend + Vite dev server)

App: **http://localhost:5000**

### Linux / macOS

```bash
chmod +x run.sh
./run.sh
```

Same idea: env checks, installs, DB setup, then `npm run dev` and optional AI service.

---

## Environment Variables

Create a **`.env`** file in the **project root** (same folder as `package.json`).

### Required for full features

| Variable        | Description                    | Example |
|----------------|--------------------------------|--------|
| `DATABASE_URL` | PostgreSQL connection string   | `postgresql://user:pass@host:5432/dbname?sslmode=require` |

### Optional

| Variable                    | Description                          | Default / note            |
|----------------------------|--------------------------------------|---------------------------|
| `SESSION_SECRET`           | Secret for sessions / JWT            | `pharmacy-secret-key`     |
| `AI_SERVICE_URL`           | AI microservice base URL             | `http://localhost:8000`   |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business API                | -                         |
| `WHATSAPP_ACCESS_TOKEN`    | WhatsApp Business API                | -                         |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WhatsApp Business API            | -                         |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Webhook verification token      | -                         |

Example `.env`:

```env
DATABASE_URL=postgresql://user:password@host.example.com:5432/neondb?sslmode=require
SESSION_SECRET=your-long-random-secret-here
AI_SERVICE_URL=https://your-ai-service.example.com
```

The app loads `.env` from the project root at startup (see `server/index.ts`). For production, most platforms use their own env UI instead of a file.

**Template:** Copy `.env.example` to `.env` and fill in values. Use the same variables in Render/Vercel dashboard.

```bash
cp .env.example .env
```

---

## Database Setup (PostgreSQL)

### Using Neon (recommended)

1. Sign up at [neon.tech](https://neon.tech).
2. Create a project and a database.
3. Copy the connection string (with user, password, host, DB name).
4. Set `DATABASE_URL` in `.env` (local) or in your host’s environment (production).

Example:

```env
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### Other providers

- **Supabase**: Create project → Settings → Database → Connection string (URI).
- **Railway / Render**: Create a Postgres service and copy `DATABASE_URL` from the dashboard.
- **Self-hosted**: Use a connection string of the form  
  `postgresql://user:password@host:5432/database_name`.

### Apply schema and seed (local or first deploy)

From the project root:

```bash
npm run db:push
npm run db:seed
```

Or use the one-shot setup:

```bash
npm run db:setup
```

This creates tables and default users (e.g. admin / admin123). See [Default Credentials](#default-credentials--security).

---

## Production Build

From the project root:

```bash
npm install
npm run build
```

This will:

1. Build the **client** (Vite) into `dist/public/`.
2. Build the **server** (esbuild) into `dist/index.cjs`.

Run in production:

```bash
NODE_ENV=production node dist/index.cjs
```

Or use the npm script:

```bash
npm start
```

The server will serve the built frontend and the API on the same port (default **5000**). Set `PORT` in the environment if your host expects a different port (e.g. Railway/Render often set `PORT` for you).

---

## Hosting Options

### Render + Vercel + Python (recommended layout)

| Where | What | Do you need it? |
|-------|------|------------------|
| **Vercel** | Frontend only (React/Vite SPA) | **Yes** when you want frontend on Vercel |
| **Render – Service 1** | Node.js backend (API only) | **Yes** (main API) |
| **Render – Service 2** | Python AI (Flask) | **Yes**, if you want AI – add a second Web Service |
| **Database** | PostgreSQL (Neon or Render Postgres) | **Yes** |

**Split setup (Vercel frontend + Render backend + AI):**

1. **Render – Backend (Node)**  
   - Root: repo root. Build: `npm install && npm run build`. Start: `npm start`.  
   - Env: `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production`, `AI_SERVICE_URL=https://your-ai-service.onrender.com`, and **`CORS_ORIGIN=https://your-app.vercel.app`** (your Vercel frontend URL).

2. **Render – AI (Python)**  
   - Root: `ai-service`. Build: `pip install -r requirements.txt`. Start: `python app.py`.  
   - Copy its URL into the Node service’s `AI_SERVICE_URL`.

3. **Vercel – Frontend**  
   - Deploy the **client** only: e.g. Root: `client`, Build: `cd .. && npm install && npm run build` (or use a root build that outputs the client). Set **Output Directory** to `dist/public` if building from repo root, or configure Vite to output to a directory Vercel serves.  
   - In Vercel, set **`VITE_API_URL=https://your-backend.onrender.com`** (no trailing slash). All API requests from the browser will go to Render.

The app uses `VITE_API_URL` for every API request when set; leave it unset when frontend and backend are same origin (e.g. frontend served by Node on Render).

**Single-origin (no Vercel):**  
You can keep the **frontend on Render** (served by the Node app). Do not set `VITE_API_URL` or `CORS_ORIGIN`; the built SPA is served from the same Node process.

---

| Option   | Best for              | Complexity | Node | Postgres | Python AI   |
|----------|------------------------|------------|------|----------|-------------|
| **A. VPS** | Full control, one server | Medium     | Same server | External (e.g. Neon) or same server | Same server or separate |
| **B. Railway** | Easiest PaaS           | Low        | One service | Railway Postgres or external | Separate service (optional) |
| **C. Render**  | Simple PaaS, free tier | Low        | Web Service | Render Postgres or external | Background Worker or separate (optional) |

---

## Option A: Single VPS (Ubuntu)

Use a single Ubuntu server (e.g. DigitalOcean, AWS EC2, Linode) to run Node and, optionally, the AI service. Use Neon (or any Postgres) for the database.

### 1. Server setup

- Ubuntu 22.04 LTS.
- Open ports: **22** (SSH), **80**, **443** (and optionally **5000** if not using a reverse proxy).

### 2. Install Node.js, Python, and PM2

```bash
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python and pip
sudo apt update && sudo apt install -y python3 python3-pip python3-venv

# PM2 (process manager)
sudo npm install -g pm2
```

### 3. Clone and build

```bash
cd /var/www  # or your preferred path
sudo git clone https://github.com/your-org/Suvidha-City-Chemist.git
cd Suvidha-City-Chemist
sudo chown -R $USER:$USER .
npm install
npm run build
```

### 4. Environment file

```bash
nano .env
```

Add at least:

```env
DATABASE_URL=postgresql://...
NODE_ENV=production
SESSION_SECRET=generate-a-long-random-string
PORT=5000
```

If the AI service runs on the same host:

```env
AI_SERVICE_URL=http://127.0.0.1:8000
```

### 5. Run the main app with PM2

```bash
pm2 start dist/index.cjs --name suvidha-api
pm2 save
pm2 startup
```

### 6. (Optional) Run AI service with PM2

```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
pm2 start "python3 ai-service/app.py" --name suvidha-ai --cwd /var/www/Suvidha-City-Chemist
pm2 save
```

### 7. Reverse proxy and SSL (Nginx + Let’s Encrypt)

- Point Nginx to `http://127.0.0.1:5000` for the main app.
- Use Certbot for HTTPS.

Example Nginx server block (after Certbot):

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
server {
    listen 443 ssl;
    server_name yourdomain.com;
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 8. Database migrations and seed (one-time)

On the server (or from your machine with `DATABASE_URL` pointing to prod):

```bash
npm run db:push
npm run db:seed
```

---

## Option B: Railway

1. Create a project at [railway.app](https://railway.app).
2. **Postgres**: Add a Postgres plugin; copy `DATABASE_URL` from the Variables tab.
3. **Backend**: New Service → Deploy from GitHub (this repo). Set root directory to the repo root.
4. **Variables**: In the service, add:
   - `DATABASE_URL` (from Postgres plugin or your own).
   - `NODE_ENV=production`
   - `SESSION_SECRET` (long random string).
   - Optional: `AI_SERVICE_URL` if you deploy the AI service elsewhere.
5. **Build & start**:
   - Build: `npm install && npm run build`
   - Start: `npm start` (or `node dist/index.cjs`)
   - Railway usually sets `PORT`; ensure your app reads `process.env.PORT || 5000` if needed (you can add that in `server/index.ts` for Railway).
6. **Deploy**: Push to the connected branch; Railway will build and run.
7. **AI service (optional)**: Add another service, use `ai-service` as root, build with `pip install -r requirements.txt`, start command `python app.py`. Expose it and set `AI_SERVICE_URL` in the main service to that URL.

---

## Option C: Render

1. Go to [render.com](https://render.com) and create a Web Service connected to this repo.
2. **Environment**:
   - Add **PostgreSQL** from Render dashboard and use the provided `DATABASE_URL`, or use your own.
   - Add `NODE_ENV=production`, `SESSION_SECRET`, and optional `AI_SERVICE_URL`.
3. **Build**:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
4. **Port**: Render sets `PORT`; if your app only uses a fixed `5000`, change `server/index.ts` to use `process.env.PORT || 5000` so Render can inject its port.
5. **Migrations**: After first deploy, run from your machine (with prod `DATABASE_URL`) or add a one-off job:
   - `npm run db:push && npm run db:seed`

For the **AI service**, you can add a second Web Service or Background Worker with Python, `pip install -r requirements.txt`, and `python app.py`, then set `AI_SERVICE_URL` in the main service to that URL.

**Deploying the frontend to Vercel (split with Render):**

1. In Vercel, create a new project from this repo.
2. **Root Directory:** leave as repo root (or set to `client` if you configure a client-only build).
3. **Build Command:** `npm install && npm run build` (from repo root; builds client into `dist/public`).
4. **Output Directory:** `dist/public` (Vercel will serve the built SPA from here).
5. **Environment variable:** Add `VITE_API_URL` = `https://your-backend.onrender.com` (your Render Node service URL, no trailing slash).
6. On **Render**, for the Node backend, set **CORS_ORIGIN** = `https://your-vercel-app.vercel.app` (or your custom Vercel domain).

After deploy, the Vercel site will call the Render API for all `/api/*` requests.

---

## Post-Deploy Checklist

- [ ] **Database**: `DATABASE_URL` set and reachable from the host.
- [ ] **Schema**: `npm run db:push` has been run (tables exist).
- [ ] **Seed**: `npm run db:seed` has been run (admin and default data; optional if you manage users yourself).
- [ ] **Env**: `NODE_ENV=production`, `SESSION_SECRET` set; optional: `AI_SERVICE_URL`, WhatsApp vars.
- [ ] **Port**: App listens on the port the host expects (often `process.env.PORT`); adjust `server/index.ts` if needed.
- [ ] **HTTPS**: Production URL uses HTTPS (via platform or Nginx + Certbot).
- [ ] **Credentials**: Change default admin password after first login.

---

## Default Credentials & Security

After running `npm run db:seed`, these logins exist (change them in production):

| Role    | Username  | Password   |
|---------|-----------|------------|
| Admin   | `admin`   | `admin123` |
| Manager | `manager1` | `password123` |
| Cashier | `cashier1` | `password123` |

**Security:**

- Change all default passwords after first deploy.
- Use a long, random `SESSION_SECRET`.
- Keep `.env` out of Git; use the host’s environment or secrets manager in production.
- Restrict database and AI service (if separate) to your app server or allowed IPs only.

---

## Quick Reference

| Task              | Command / action                          |
|-------------------|--------------------------------------------|
| Local run (Win)   | `run.bat`                                  |
| Local run (Unix)  | `./run.sh`                                 |
| Production build | `npm run build`                            |
| Production start  | `npm start` or `node dist/index.cjs`       |
| DB schema         | `npm run db:push`                          |
| DB seed           | `npm run db:seed`                          |
| DB setup (both)   | `npm run db:setup`                         |

For more help, check the repo README or open an issue.
