<div align="center">

<img src="frontend/public/logo.svg" alt="Umuranga Logo" width="80" />

# Umuranga

### AI-Powered End-to-End Talent Screening Platform

*Screen smarter. Hire faster. Keep humans in control.*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://umuranga.vercel.app)
[![Backend](https://img.shields.io/badge/API-Render-46E3B7?style=for-the-badge&logo=render)](https://umuranga.onrender.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## What is Umuranga?

Umuranga is a full-stack AI hiring platform that takes candidates from raw application to final selection — fully automated, yet always HR-controlled. It replaces hours of manual CV screening, email drafting, and interview scheduling with a structured AI pipeline that scores, ranks, explains, and communicates every step.

### Core Capabilities

| Stage | What happens |
|---|---|
| **CV Screen** | AI reads every CV and scores candidates against the job description |
| **Deep Review** | A second AI pass probes cultural fit, experience depth, and red flags |
| **Practical Assessment** | Role-adaptive project brief auto-generated with real dummy datasets attached |
| **AI Video Interview** | Candidates join a live AI-hosted interview recorded in the browser |
| **Final Selection** | AI synthesises all stage scores and writes a boardroom-ready selection report |

---

## Feature Highlights

- **Multi-stage hiring pipeline** — configurable stages per job, with full rollback support
- **Real-time screening progress** — live progress bar updates candidate-by-candidate as AI works
- **Role-adaptive project generation** — data roles get CSV datasets; strategy roles get document briefs
- **AI video interviews** — browser-based, recorded, with OpenAI TTS voice + transcript grading
- **Smart pre-shortlisting** — when HR sets a target count (e.g. "pick 5"), the top-N are pre-ticked automatically
- **Applicant email automation** — AI drafts personalised outcome emails; HR previews then sends
- **Final AI conclusion** — executive summary, ranked list, top recommendation, and risk notes
- **Loading indicators & progress** — every button and every AI task shows live status
- **Fully deployed** — frontend on Vercel, backend on Render, DB on MongoDB Atlas

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), TypeScript, React |
| **Styling** | Inline CSS-in-JS (no Tailwind dependency — ships fast) |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **AI — LLM** | Google Gemini 2.5 Flash (screening, grading, emails, project generation) |
| **AI — Voice** | OpenAI TTS (`tts-1`) — streamed audio mixed into recording |
| **AI — Speech** | Web Speech API (`SpeechRecognition`, `en-US`) |
| **Auth** | JWT (HTTP-only cookie), bcrypt |
| **Email** | Nodemailer + SMTP (Gmail App Password) |
| **File Handling** | Multer (multipart uploads), XLSX generation |
| **Deployment** | Vercel (frontend) + Render (backend) |

---

## Project Structure

```
Umuranga/
├── frontend/                  # Next.js recruiter dashboard & candidate portal
│   └── src/app/
│       ├── (auth)/            # Login page
│       ├── (dashboard)/       # HR dashboard — jobs, candidates, pipeline
│       ├── interview/         # Candidate AI video interview page
│       └── assessment/        # Candidate practical assessment submission
│
├── backend/                   # Express REST API
│   └── src/
│       ├── config/            # Gemini, OpenAI, DB, rate-limit config
│       ├── middleware/        # JWT auth, error handling
│       ├── models/            # Mongoose schemas (Job, Candidate, Pipeline, …)
│       ├── routes/            # REST endpoints (jobs, pipeline, screening, public)
│       └── services/          # AI logic (screening, grading, emails, interviews)
│
├── assets/                    # Logos, mockups, brand files
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- MongoDB Atlas URI (free tier works)
- Google Gemini API key ([get one free](https://aistudio.google.com))
- OpenAI API key (for TTS voice — optional, falls back gracefully)
- SMTP credentials (Gmail App Password recommended)

### 1. Clone the repository

```bash
git clone https://github.com/ngamijex/umuranga.git
cd umuranga
```

### 2. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend (separate terminal)
cd frontend && npm install
```

### 3. Configure environment variables

**Backend** — create `backend/.env`:

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/umuranga

JWT_SECRET=your_random_secret_here
JWT_EXPIRES_IN=7d

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

OPENAI_API_KEY=your_openai_api_key
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=alloy

FRONTEND_URL=http://localhost:3000

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=Umuranga Hiring <you@gmail.com>

# Optional: slow down batch screening to avoid rate limits (ms between candidates)
# LLM_MS_BETWEEN_CANDIDATES=0
```

**Frontend** — create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. Run in development

```bash
# Backend (port 5000)
cd backend && npm run dev

# Frontend (port 3000) — separate terminal
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and register your first recruiter account.

---

## Deployment

### Backend → Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect the GitHub repo, set **Root Directory** to `backend`
3. **Build command:** `npm install && npm run build`
4. **Start command:** `node dist/index.js`
5. Add all `backend/.env` variables as Render environment variables
6. Set `FRONTEND_URL` to your Vercel URL (e.g. `https://umuranga.vercel.app`)

### Frontend → Vercel

1. Import the GitHub repo on [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. **Framework:** Next.js | **Build command:** `npm run build`
4. Add environment variable: `NEXT_PUBLIC_API_URL=https://umuranga.onrender.com/api`

> **CORS note:** The backend dynamically allows `*.vercel.app` preview URLs, so branch deploys work automatically.

---

## How the AI Pipeline Works

```
Candidates apply
       │
       ▼
┌─────────────────────────────────────────────────────┐
│  STAGE 1 — CV Screen                                │
│  Gemini reads every CV vs. job description          │
│  → Scores + recommendation + justification          │
│  → Progress updates 1-by-1 in real time             │
└────────────────────┬────────────────────────────────┘
                     │ HR confirms shortlist (pre-ticked by AI)
                     ▼
┌─────────────────────────────────────────────────────┐
│  STAGE 2 — Deep Review                              │
│  Second Gemini pass on shortlisted candidates       │
│  → Cultural fit, experience depth, red flags        │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  STAGE 3 — Practical Assessment                     │
│  AI generates role-adaptive project brief           │
│  → Data roles: real CSV datasets auto-attached      │
│  → Non-data roles: strategy/document deliverables   │
│  Candidates submit via personal link                │
│  → AI grades submissions automatically              │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  STAGE 4 — AI Video Interview                       │
│  Candidate joins browser-based interview            │
│  → AI asks tailored questions via OpenAI TTS voice  │
│  → Mic + AI audio mixed and recorded together       │
│  → Transcript graded automatically on call end      │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  FINAL — AI Selection Report                        │
│  Gemini synthesises all stages                      │
│  → Executive summary, candidate rankings            │
│  → Top recommendation with risk notes               │
└─────────────────────────────────────────────────────┘
```

---

## API Overview

All endpoints require `Authorization: Bearer <token>` except `/api/auth/*` and `/api/public/*`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create recruiter account |
| `POST` | `/api/auth/login` | Get JWT token |
| `GET` | `/api/jobs` | List all jobs |
| `POST` | `/api/jobs` | Create a job |
| `POST` | `/api/candidates/upload` | Upload CVs (bulk) |
| `GET` | `/api/pipeline/:jobId` | Get full pipeline state |
| `POST` | `/api/pipeline/:jobId/stage/:idx/run` | Run AI screening for a stage |
| `GET` | `/api/pipeline/:jobId/stage/:idx/progress` | Poll live screening progress |
| `POST` | `/api/pipeline/:jobId/final-conclusion` | Generate final AI selection report |
| `GET` | `/api/public/interview/:token` | Candidate interview session |
| `GET` | `/api/public/practical/:jobId` | Candidate assessment page |

---

## Screenshots

> Dashboard, pipeline, interview, and assessment views

| HR Dashboard | Pipeline Screening | AI Interview |
|---|---|---|
| *(coming soon)* | *(coming soon)* | *(coming soon)* |

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "feat: your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a pull request

---

## License

[MIT](LICENSE) © 2026 Umuranga — Built with ❤️ for the Umurava Hackathon

---

<div align="center">
  <sub>Powered by Google Gemini · OpenAI · MongoDB Atlas · Vercel · Render</sub>
</div>
