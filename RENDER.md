# Render deployment – connect Frontend, Backend, and PostgreSQL

## Overview

- **Backend (Flask):** https://cyber-forge-1.onrender.com  
- **PostgreSQL:** Render-hosted (e.g. `smart_sol`)  
- **Frontend (Next.js):** your Render frontend URL  

The app is set up so the frontend talks to the backend, and the backend uses the Postgres DB. Configure the env vars below so CORS, cookies, and DB all work.

---

## 1. Backend service (Flask) on Render

In the **Backend** service → **Environment**:

| Key | Value | Notes |
|-----|--------|--------|
| `DATABASE_URL` | `postgresql://admin:...@dpg-d613k794tr6s73824ah0-a.singapore-postgres.render.com/smart_sol` | Use the **External** URL from your Render Postgres dashboard. If the service is linked to Postgres, Render may add this automatically. |
| `FRONTEND_URL` | Your frontend origin(s) | **Required.** Single URL or comma-separated (e.g. `https://cyber-forge-taupe.vercel.app` or `https://your-app.onrender.com,https://cyber-forge-taupe.vercel.app`). No trailing slash. Needed for CORS and cookies (e.g. lendborrow RFID, login). |
| `SESSION_SECRET_KEY` | (random string) | **Required in production.** Generate a long random string and set it here. |
| `RENDER` | (leave as-is) | Render sets `RENDER=true` automatically; the app uses it for secure cookies. |

- **Build:** same as current (e.g. `pip install -r requirements.txt`).  
- **Start:** e.g. `gunicorn app:app` or `python app.py` (and set **Start Command** if needed).  
- **Health check path (optional):** `/api/health`.

---

## 2. Frontend service (Next.js) on Render

In the **Frontend** service → **Environment**:

| Key | Value | Notes |
|-----|--------|--------|
| `NEXT_PUBLIC_API_URL` | `https://cyber-forge-1.onrender.com/api` | Optional but recommended. If not set, the app still uses this URL when not on `localhost`. |

- **Build:** `npm install && npm run build` (or your existing build command).  
- **Start:** `npm start` (or `npx next start`).  
- **Root directory:** `frontend` if the repo root is the project root.

---

## 3. PostgreSQL on Render

- Use the **External Database URL** from the Postgres service in the Backend env as `DATABASE_URL`.  
- If Backend and Postgres are in the same Render account and you “link” the DB to the Backend service, Render can inject `DATABASE_URL` for you; then you only need to add `FRONTEND_URL` and `SESSION_SECRET_KEY` on the Backend.

---

## 4. Quick checklist

- [ ] Backend: `DATABASE_URL` set (or auto-injected by linking Postgres).  
- [ ] Backend: `FRONTEND_URL` = your Render frontend URL (e.g. `https://cyber-forge-frontend.onrender.com`).  
- [ ] Backend: `SESSION_SECRET_KEY` set.  
- [ ] Frontend: `NEXT_PUBLIC_API_URL` = `https://cyber-forge-1.onrender.com/api` (optional but recommended).  
- [ ] After deploy: open the frontend URL, register/login, and confirm the app loads and stays logged in (session cookie works).

---

## 5. Troubleshooting

- **CORS / “blocked by CORS”:** Ensure `FRONTEND_URL` on the Backend exactly matches the frontend origin (scheme + host, no trailing slash).  
- **Session / login not persisting:** Backend must run with `RENDER=true` (automatic on Render) so cookies use `SameSite=None; Secure`.  
- **DB connection errors:** Use the **External** Postgres URL and ensure `sslmode=require` is applied (the app adds it for `render.com` URLs).  
- **Cold starts:** Render free tier spins down; first request after idle can be slow; health checks can reduce spin-down if configured.
