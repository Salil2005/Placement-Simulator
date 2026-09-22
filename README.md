# Placement Simulator (MERN Edition)

Free AI mock interview platform - practice **HR, DSA, Core CS, Web Development,
and System Design** interviews with an adaptive AI interviewer, a live coding
round, voice input/output, and a detailed scored report (charts + downloadable PDF).

Rebuilt from the original Next.js/OpenAI-Agents-SDK/Drizzle/Neon prototype into a
full **MERN stack** application:

| Layer      | Choice                                              |
| ---------- | ---------------------------------------------------- |
| Frontend   | React 19 (Vite) + Tailwind CSS + React Router         |
| Backend    | Node.js + Express (MVC), port **7000**                |
| Database   | MongoDB + Mongoose                                    |
| Realtime   | Socket.io                                             |
| Auth       | JWT + bcrypt                                          |
| AI Layer   | Provider-agnostic: **Ollama** (offline) / **Grok** / **Gemini** |
| Editor     | Monaco Editor                                         |
| Charts     | Recharts (Bar + Radar)                                |
| PDF        | pdfkit                                                |
| Uploads    | Multer (resume PDFs/DOCX)                             |

Frontend runs on **port 5002**, backend on **port 7000**.

---

## Project Structure

```
placement-simulator-mern/
├── docker-compose.yml
├── server/                     # Express + MongoDB backend (port 7000)
│   ├── config/                 # env, db connection
│   ├── models/                 # User, Interview, Question, Response, Report, Session
│   ├── controllers/            # auth, interview, report, history, profile
│   ├── routes/
│   ├── middleware/             # JWT auth, error handler, multer upload
│   ├── services/
│   │   ├── ai/                 # aiService facade + ollama/grok/gemini providers
│   │   ├── interview/          # interviewEngine (adaptive Q&A flow)
│   │   └── report/             # reportGenerator (scores + PDF)
│   ├── prompts/                # promptBuilder.js
│   ├── knowledge/               # topics.js (DSA/CS/Web/System Design/HR banks)
│   ├── sockets/                # Socket.io live-interview events
│   ├── uploads/                # resume uploads (gitignored)
│   ├── reports/                # generated PDF reports (gitignored)
│   └── server.js / app.js
└── client/                     # React + Vite frontend (port 5002)
    └── src/
        ├── pages/               # Landing, Login, Register, Dashboard,
        │                        # CreateInterview, Interview, Coding, Report,
        │                        # History, Profile, NotFound
        ├── components/          # layout, chat/interview, coding, charts, ui
        ├── context/              # AuthContext, ThemeContext
        ├── hooks/                # useAuth, useInterview, useSpeech
        └── services/             # api.js, authService.js, interviewService.js
```

---

## Quick Start (local, no Docker)

### 1. MongoDB
Run MongoDB locally, or use a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
and put the connection string in `server/.env`.

### 2. Backend

```bash
cd server
cp .env.example .env
# fill in MONGO_URI, JWT_SECRET, and at least one AI provider key
npm install
npm run dev
# -> http://localhost:7000
```

### 3. Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev
# -> http://localhost:5002
```

Open **http://localhost:5002**, register an account, and start an interview.

---

## Quick Start (Docker)

```bash
cp server/.env.example server/.env
# edit server/.env with your AI provider key(s)

docker compose up --build
```

When using the default local Ollama provider, start Ollama on the host and
download the configured model first:

```bash
ollama pull qwen3:8b
```

The Docker backend reaches it through `host.docker.internal`. To use Gemini
or Grok instead, change `AI_PROVIDER` and add the corresponding key in
`server/.env` before starting Compose.

This starts:
- MongoDB on `27017`
- Backend on **`http://localhost:7000`**
- Frontend on **`http://localhost:5002`**

> Vite bakes `VITE_API_URL` into the static build at build time. If you change
> the backend URL, update the `args.VITE_API_URL` in `docker-compose.yml` and
> rebuild the `client` service.

---

## AI Provider Configuration

Set `AI_PROVIDER` in `server/.env` to switch providers **without changing any
business logic** - the rest of the app only ever talks to `services/ai/aiService.js`:

```bash
AI_PROVIDER=ollama   # fully offline, needs a local Ollama server
# or
AI_PROVIDER=grok
# or
AI_PROVIDER=gemini
```

### Ollama (offline, recommended default)
```bash
# install Ollama, then:
ollama pull qwen3:8b
```
Fast: `qwen3:8b` · Balanced: `llama3.1:8b` · Best quality: `qwen3:14b`

### Grok
Set `GROK_API_KEY` (get one from x.ai).

### Gemini
Set `GEMINI_API_KEY` (get one from Google AI Studio).

---

## API Overview

| Method | Path                              | Purpose                          |
| ------ | ---------------------------------- | --------------------------------- |
| POST   | `/api/auth/register`               | Create account (sends verification email) |
| POST   | `/api/auth/login`                  | Log in, get access + refresh token |
| POST   | `/api/auth/refresh`                | Exchange refresh token for a new access token |
| POST   | `/api/auth/logout`                 | Revoke a refresh token (log out one device) |
| GET    | `/api/auth/verify-email/:token`    | Verify email from the emailed link |
| POST   | `/api/auth/resend-verification`    | Resend the verification email     |
| GET    | `/api/auth/me`                     | Current user                      |
| GET    | `/api/interviews`                  | List my interviews                |
| POST   | `/api/interviews`                  | Create interview (+ resume)       |
| GET    | `/api/interviews/:id`              | Get interview + transcript + pending question |
| POST   | `/api/interviews/:id/start`        | Generate question #1              |
| POST   | `/api/interviews/:id/respond`      | Submit answer, get next question  |
| POST   | `/api/interviews/:id/finish`       | Generate final report             |
| GET    | `/api/reports/:interviewId`        | Fetch report                      |
| GET    | `/api/reports/:interviewId/download` | Download report PDF             |
| GET    | `/api/history`                     | Completed interviews + reports    |
| GET    | `/api/dashboard`                   | Stats + recent interviews         |
| PUT    | `/api/profile`                     | Update name/theme/avatar          |
| PUT    | `/api/profile/password`            | Change password                   |

Answers can also be submitted over the live Socket.io connection (`interview:answer`,
with the client automatically falling back to the REST `/respond` endpoint if the
socket is unavailable) - see `sockets/interviewSocket.js` and `hooks/useInterview.js`.

All `/api/*` routes are rate limited; `/api/auth/register`, `/api/auth/login`, and
`/api/auth/resend-verification` have a stricter limit to blunt brute-force/credential
stuffing. Configure limits via `RATE_LIMIT_*`/`AUTH_RATE_LIMIT_MAX` in `server/.env`.

---

## Interview Categories & Topics

- **HR / Behavioral** - STAR-method probing
- **DSA** - Arrays, Trees, Graphs, DP, Recursion, Hashing, etc. (with Monaco coding round)
- **Core CS** - DBMS, OS, Networks, OOP, SQL, Concurrency
- **Web Development** - HTML/CSS/JS/TS/React/Node/Express/MongoDB/JWT
- **System Design** - Caching, Load Balancing, Microservices, Scalability, CDN

---

## License

MIT

---

## Placement Simulator — New Features

### 1. Overall Placement Readiness

Aggregates every completed interview category into one weighted readiness report.

**Backend**
- `models/PlacementReport.js` — stored combined report (one per user, upserted)
- `services/report/placementConfig.js` — default weights, normalization, readiness levels
- `services/report/placementGenerator.js` — collects latest report per category, computes weighted score, calls AI, renders PDF
- `controllers/placementController.js` + `routes/placementRoutes.js`

**Weights (default):** DSA 35%, Core CS 25%, Web Development 20%, System Design 10%, HR 10%.
Only completed categories are scored; their weights are **normalized automatically** (incomplete categories are ignored, never scored as zero).

**Readiness levels:** 95–100 Outstanding · 85–94 Placement Ready · 70–84 Almost Placement Ready · 55–69 Needs More Practice · <55 Beginner.

**Endpoints**
- `GET  /api/placement/eligibility` — completed count + eligibility (needs ≥ 2 categories)
- `POST /api/placement/generate` — build/refresh the combined report
- `GET  /api/placement` — latest report
- `GET  /api/placement/download` — PDF

**Frontend:** `/placement` page with progress ring, category bar + radar charts, comparison table, strengths/weaknesses, improvement priority, placement prediction, AI summary, and PDF download. Buttons on Dashboard, Header, and Report pages.

### 2. Resume Analysis

**Backend**
- `models/ResumeProfile.js` — parsed resume + latest analysis (one per user)
- `services/report/resumeExtractor.js` — text extraction: `.pdf` (`pdf-parse`), `.docx` (`mammoth`), `.doc` (`word-extractor`), `.txt` (read as-is)
- `services/report/resumeAnalyzer.js` — parse resume, compare vs interview performance
- `controllers/resumeController.js` + `routes/resumeRoutes.js`

**Endpoints**
- `POST /api/resume/upload` — upload + AI-parse resume (multipart `resume`, accepts .pdf/.doc/.docx)
- `POST /api/resume/analyze` — resume-vs-interview analysis + match score
- `GET  /api/resume` — stored profile + last analysis

**Frontend:** `/resume` page — upload, extracted skills/languages/frameworks/databases/projects, Resume Match Score ring, verified vs unverified skills, missing areas, AI suggestions.

### 3. Auth hardening: refresh tokens, rate limiting, email verification

- **Refresh tokens.** Login/register return a short-lived `accessToken` (15 min
  default) and a long-lived `refreshToken` (30 days default, hashed before
  storage). `client/src/services/api.js` transparently refreshes an expired
  access token on a 401 and retries the original request; if the refresh
  token itself is invalid/expired, the app clears local state and drops the
  user back to a logged-out view. `POST /api/auth/logout` revokes a single
  refresh token so signing out only ends that device/session.
- **Rate limiting.** `middleware/rateLimiter.js` (via `express-rate-limit`)
  applies a general limit to all `/api/*` routes and a stricter one to
  `/auth/register`, `/auth/login`, and `/auth/resend-verification`. Tune with
  `RATE_LIMIT_WINDOW_MIN`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`.
- **Email verification.** Registering sends a verification email (link:
  `CLIENT_URL/verify-email/:token`, handled by the new `/verify-email/:token`
  page). Enforcement is off by default (`REQUIRE_EMAIL_VERIFICATION=false`)
  so the app works immediately without any SMTP setup - verification emails
  are printed to the server console (`utils/email.js`) until real SMTP
  credentials are supplied. Set `REQUIRE_EMAIL_VERIFICATION=true` plus
  `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` to require verified emails before login;
  the login page then offers a "Resend verification email" action
  automatically when it gets that specific error back.

### Setup notes
- Run `npm install` in `/server` (adds `pdf-parse`, `mammoth`, `word-extractor`,
  `express-rate-limit`, `nodemailer`) and `/client`.
- After pulling these changes, set `JWT_REFRESH_SECRET` in `server/.env` to a
  new random string (different from `JWT_SECRET`) - see the updated
  `server/.env.example`. Existing logged-in users will simply be asked to log
  in again once their old-style token expires.
- Existing interview reports and endpoints are unchanged and fully backward compatible.
- New categories can be added by extending `DEFAULT_WEIGHTS` in `placementConfig.js` only.
