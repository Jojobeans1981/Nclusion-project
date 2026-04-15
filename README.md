# Data-Optimized Mobile Sports Betting Platform (Haiti MVP)

Android-first, offline-first sportsbook designed for low bandwidth and unreliable connectivity.

## What Is Included

- Mobile PWA frontend (Haitian Creole primary, French secondary).
- Offline queue for bets with reconnect sync.
- Server-authoritative backend for real settlement integrity.
- Capacitor Android scaffolding and debug APK build pipeline.

## Architecture

- Frontend: static app (`index.html`, `styles.css`, `app.js`) with local cache + offline queue.
- Backend: `backend/server.js` (no framework dependency) with:
  - login + signed session token
  - server-side odds validation
  - idempotent bet placement (`x-idempotency-key`)
  - server-side settlement and payout crediting
  - bet integrity signature (HMAC)
- Android packaging: Capacitor (`android/` native project + sync/build scripts).

## Security/Integrity Controls Implemented

- Client stake/odds are not trusted for settlement; backend re-prices using server-side match odds.
- Bet placement requires signed session auth.
- Idempotency key prevents duplicate bet debits on retries.
- Settlement and payout run server-side only.
- Each stored bet carries integrity signature (`integrity` HMAC).

## Quick Start

1. Run frontend:

```bash
npm start
```

2. Run backend (separate terminal):

```bash
npm run start:backend
```

3. Open `http://localhost:5173`

4. In app settings:
- `Backend API URL`: `http://localhost:4001`
- `User ID`: `demo-user-001`
- `PIN`: `0000`
- Save settings

## Backend Environment Variables

- `BACKEND_PORT` (default `4001`)
- `ODDS_API_KEY` (optional; uses mock odds when absent)
- `ODDS_API_BASE` (default `https://api.the-odds-api.com/v4`)
- `SESSION_SECRET`
- `BET_SECRET`
- `SETTLEMENT_ADMIN_KEY`

## API Surface (Backend)

- `POST /auth/login`
- `GET /v1/me`
- `GET /v1/matches`
- `GET /v1/bets`
- `POST /v1/bets`
- `POST /v1/settlements/run` (admin key required)
- `GET /health`

## Android (Capacitor) Flow

1. Build web assets:

```bash
npm run build:web
```

2. Sync to Android native project:

```bash
npm run cap:sync
```

3. Open Android Studio project:

```bash
npm run android:open
```

4. Build debug APK from CLI:

```bash
npm run android:apk:debug
```

Expected output path after successful build:

- `android/app/build/outputs/apk/debug/app-debug.apk`

## Android Prerequisites

- Java 17+ installed and `JAVA_HOME` set.
- Android SDK installed (`ANDROID_HOME`/`ANDROID_SDK_ROOT`).
- Android build tools/platforms installed via Android Studio.

This machine currently fails APK compile because Java is missing (`JAVA_HOME` not set).

## Scripts

- `npm start`
- `npm run start:backend`
- `npm run start:balance` (legacy mock balance API)
- `npm run build:web`
- `npm run cap:sync`
- `npm run android:open`
- `npm run android:apk:debug`

## Deployment (Vercel + Render)

### 1) Deploy frontend on Vercel

- Import this GitHub repo in Vercel.
- Vercel will use `vercel.json`:
  - build command: `npm run build:web`
  - output directory: `www`

### 2) Deploy backend on Render

- In Render, create from Blueprint and point to this repo.
- Render will use `render.yaml` to create the backend service.
- Set `ODDS_API_KEY` in Render environment if using live odds.

### 3) Connect frontend to backend

- Open deployed frontend app.
- In **Konfigirasyon API / Configuration API**:
  - set `Backend API URL` to your Render service URL
  - set `User ID` to `demo-user-001`
  - set `PIN` to `0000`
