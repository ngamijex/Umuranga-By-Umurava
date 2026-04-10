# Umuranga — AI-Powered Talent Screening System

> Built for the Umurava Hackathon. Umuranga helps recruiters quickly and fairly evaluate job applicants by analyzing structured profiles and unstructured resumes, ranking top candidates, and clearly explaining every recommendation — while keeping humans in control of final decisions.

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| Frontend    | Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui |
| Backend     | Node.js, Express, TypeScript                    |
| Database    | MongoDB Atlas (Mongoose ODM)                    |
| AI Engine   | Google Gemini API (Gemini 1.5 Pro)              |
| Auth        | NextAuth.js                                     |
| File Storage| Local (dev) / Cloudinary (prod)                 |

---

## Project Structure

```
Umuranga/
├── frontend/          # Next.js application (recruiter dashboard & candidate portal)
├── backend/           # Express API server (AI engine, data processing)
├── assets/            # Shared static files, logos, mockups
│   ├── images/
│   └── docs/
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js >= 18.x
- npm >= 9.x
- MongoDB Atlas account (or local MongoDB)
- Google Gemini API key

### 1. Clone & install

```bash
# Frontend
cd frontend && npm install

# Backend
cd backend && npm install
```

### 2. Configure environment variables

```bash
# Frontend
cp frontend/.env.example frontend/.env.local

# Backend
cp backend/.env.example backend/.env
```

Fill in the values in both `.env` files (MongoDB URI, Gemini API key, etc.).

### 3. Run in development

```bash
# Frontend (port 3000)
cd frontend && npm run dev

# Backend (port 5000)
cd backend && npm run dev
```

---

## Environment Variables

See `frontend/.env.example` and `backend/.env.example` for all required variables.

---

## License

MIT
