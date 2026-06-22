# 🚀 AI Site Builder

<div align="center">

**Transform your ideas into production-ready websites using natural language — powered by Google Gemini AI.**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_App-6366f1?style=for-the-badge)](https://ai-site-builder-sandy.vercel.app/)
[![Backend](https://img.shields.io/badge/🖥️_Backend-Render-46E3B7?style=for-the-badge)](https://ai-site-builder-ag8l.onrender.com)
[![Frontend](https://img.shields.io/badge/⚡_Frontend-Vercel-000000?style=for-the-badge)](https://ai-site-builder-sandy.vercel.app/)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Key Features](#-key-features)
- [System Architecture & Design Decisions](#-system-architecture--design-decisions)
- [AI Pipeline Deep Dive](#-ai-pipeline-deep-dive)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Credits & Payment System](#-credits--payment-system)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)

---

## 🌟 Overview

**AI Site Builder** is a full-stack SaaS platform that lets users describe a website in plain English and receive a fully functional, responsive HTML/CSS/JS website — generated in seconds by Google Gemini AI.

Users can iteratively refine their site through a chat interface, roll back to any previous version, publish projects publicly, and manage usage through a credits-based billing system.

> Built as a **monolithic full-stack application** with a React (Vite) frontend and an Express + TypeScript backend, connected to a PostgreSQL database via Prisma ORM.

---

## 🔗 Live Demo

| Service | URL |
|---|---|
| 🌐 Frontend (Vercel) | [https://ai-site-builder-sandy.vercel.app/](https://ai-site-builder-sandy.vercel.app/) |
| 🖥️ Backend API (Render) | [https://ai-site-builder-ag8l.onrender.com](https://ai-site-builder-ag8l.onrender.com) |

---

## ✨ Key Features

### 🤖 AI-Powered Generation
- **Natural language → website**: Describe your site, get production-ready HTML
- **3-stage AI pipeline**: Prompt enhancement → image keyword extraction → code generation
- **Iterative refinement**: Request changes via chat — the AI preserves existing functionality while applying updates
- **Multi-model fallback with retry logic**: Gemini 2.5 Flash → 2.5 Flash Lite → 2.0 Flash with exponential backoff

### 🖼️ Smart Image Integration
- Automatic Pexels image search based on AI-extracted keywords
- Hero sections and content areas populated with real, relevant photography
- No placeholder images — every generated site looks production-ready from day one

### 📝 Version Control
- Every generation and revision is saved as a versioned snapshot
- One-click rollback to any previous version
- Full conversation history per project

### 🔐 Authentication & Authorization
- Email/password authentication via **Better Auth**
- Session-based auth with HTTP-only secure cookies
- Per-user project isolation — users only access their own projects

### 💳 Credits System
- Users start with 20 free credits
- **5 credits** to create a new project
- **2 credits** per revision
- Automatic credit refund on AI generation failure
- Stripe payment integration for purchasing additional credits

### 🌐 Publishing
- Toggle projects between private and publicly accessible
- Shareable public URLs for published projects
- Public gallery of community-published sites

---

## 🏗️ System Architecture & Design Decisions

### Why a Monolithic Architecture?

This project deliberately uses a **monolith-first** approach rather than microservices. Here's the reasoning:

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (Vercel)                   │
│              React + Vite + TypeScript               │
│         Tailwind CSS + Radix UI + React Router       │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS / REST API
                      │
┌─────────────────────▼───────────────────────────────┐
│                  SERVER (Render)                     │
│              Express + TypeScript                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │  Routes  │ │  Auth    │ │  Controllers          │ │
│  │  /user   │ │ (Better  │ │  UserController       │ │
│  │  /project│ │  Auth)   │ │  ProjectController    │ │
│  └──────────┘ └──────────┘ └──────────────────────┘ │
│  ┌────────────────────────────────────────────────┐  │
│  │              AI Pipeline Layer                  │  │
│  │  Gemini Config → Fallback.ts → Controllers     │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │              Prisma ORM Layer                   │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              PostgreSQL (Neon Serverless)             │
│   Users │ Projects │ Versions │ Conversations        │
│   Sessions │ Accounts │ Transactions                 │
└─────────────────────────────────────────────────────┘
```

**Reasons for choosing a monolith:**

| Factor | Decision |
|---|---|
| **Team size** | Single developer — microservices add operational overhead with no benefit |
| **Complexity** | The domain is well-understood; no need for independent scaling of sub-domains |
| **Deployment cost** | One Render instance vs. multiple services with separate billing and networking |
| **Shared data** | User auth, credits, projects, and conversations are tightly coupled — splitting them across services would require distributed transactions |
| **Development velocity** | Monoliths are faster to build, debug, and iterate when the scope is clear |
| **Future-proofing** | The codebase is modular (Controllers / Routes / Services / Middlewares) — extracting into microservices later is straightforward if scaling demands it |

> **The rule of thumb**: Start with a monolith. Extract services when you have a proven need — not before.

---

### Database Schema Design

```
User
 ├── WebsiteProject (1:N)
 │    ├── Conversation (1:N)  — chat history per project
 │    └── Version (1:N)       — snapshot of generated code
 ├── Transaction (1:N)        — credit purchase history
 ├── Session (1:N)            — Better Auth sessions
 └── Account (1:N)            — OAuth / credential accounts
```

**Key design choices:**

- `current_code` stored directly on `WebsiteProject` for O(1) preview access — no join required
- `current_version_index` references the active `Version` ID, enabling instant rollback
- `Conversation` uses a `Role` enum (`user` / `assistant`) — mirrors the LLM message format for easy replay
- Cascade deletes on `Version` and `Conversation` when a `WebsiteProject` is deleted — no orphaned data
- `credits` on `User` is an integer column with atomic `decrement` / `increment` via Prisma's update operations, preventing race conditions in concurrent requests

---

### Credit Safety with Optimistic Deduction

Credits are deducted **before** the expensive AI call, then refunded on failure:

```
Request → Validate user & credits → Deduct credits → AI generation
     ↓ success                              ↓ failure
Save to DB, return result          Refund credits, return error
```

This prevents users from triggering unlimited AI calls if the deduction check is async or delayed, while ensuring a good UX — users aren't charged for failed generations.

---

## 🤖 AI Pipeline Deep Dive

Every site generation runs through a **3-stage pipeline**:

```
User Prompt
     │
     ▼
┌─────────────────────────────────┐
│  Stage 1: Prompt Enhancement    │
│  Gemini enhances vague prompts  │
│  into detailed, specific specs  │
└──────────────────┬──────────────┘
                   │
                   ▼
┌─────────────────────────────────┐
│  Stage 2: Image Keyword Extract │
│  Gemini outputs a 1-2 word      │
│  Pexels search query            │
│  → Fetch 8 real photos          │
└──────────────────┬──────────────┘
                   │
                   ▼
┌─────────────────────────────────┐
│  Stage 3: Code Generation       │
│  Full HTML + CSS + JS output    │
│  with injected Pexels image URLs│
└──────────────────┬──────────────┘
                   │
                   ▼
           Save Version → Return to Client
```

### Multi-Model Fallback with Retry

```typescript
const models = [
  "gemini-2.5-flash",      // Primary — best quality
  "gemini-2.5-flash-lite", // Fallback — faster, cheaper
  "gemini-2.0-flash",      // Last resort
];

// Per model: up to 3 attempts with exponential backoff on 503
// On 429/400: immediately abandon and try next model
// If all models exhausted: throw critical failure
```

Additionally, **dual API key fallback** is implemented at the SDK level — if the primary API key hits its quota (429), the request is transparently retried with a secondary key.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + Vite | UI framework and build tool |
| TypeScript | Type safety |
| Tailwind CSS v4 | Utility-first styling |
| Radix UI / shadcn | Accessible component primitives |
| React Router v7 | Client-side routing |
| Axios | HTTP client |
| Better Auth UI | Pre-built auth components |
| Sonner | Toast notifications |
| Lucide React | Icon library |
| next-themes | Dark/light mode |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express 5 | HTTP server |
| TypeScript | Type safety |
| Prisma ORM v7 | Database access layer |
| PostgreSQL (Neon) | Serverless relational database |
| Better Auth | Authentication |
| Google Gemini SDK | AI text generation |
| Pexels API | Stock photography |
| OpenAI SDK | (configured for future use) |
| CORS + dotenv | Security and configuration |

---

## 📁 Project Structure

```
AI-Site-Builder/
├── client/                          # React + Vite frontend
│   ├── src/
│   │   ├── assets/
│   │   ├── componenets/             # Feature components
│   │   │   ├── EditorPanel.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Loaderstep.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── ProjectPreview.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Typewriter.tsx
│   │   │   └── ui/                 # shadcn/Radix components
│   │   ├── config/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── providers.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
└── server/                          # Express + TypeScript backend
    ├── Configs/
    │   ├── Gemini.ts               # Gemini client with dual-key fallback
    │   └── OpenAi.ts
    ├── Controllers/
    │   ├── UserController.ts       # Project CRUD, credits, conversations
    │   └── ProjectController.ts   # Revision, rollback, publish, preview
    ├── lib/
    │   ├── auth.ts                 # Better Auth configuration
    │   ├── Fallback.ts             # Multi-model fallback + retry logic
    │   ├── helperImage.ts          # Pexels image search
    │   └── prisma.ts               # Prisma client singleton
    ├── Middlewares/
    │   └── auth.ts                 # Session-based route protection
    ├── routes/
    │   ├── UserRoute.ts
    │   └── ProjectRoute.ts
    ├── Types/
    │   └── express.d.ts            # Express Request type augmentation
    ├── prisma/
    │   ├── schema.prisma
    │   └── migrations/
    ├── generated/                  # Prisma generated client
    ├── server.ts
    ├── prisma.config.ts
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.19.0
- PostgreSQL database (or [Neon](https://neon.tech) free tier)
- Google Gemini API key ([Get one free](https://aistudio.google.com/))
- Pexels API key ([Get one free](https://www.pexels.com/api/))

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/ai-site-builder.git
cd ai-site-builder
```

### 2. Setup the backend

```bash
cd server
npm install

# Copy the example env file and fill in your values
cp .env.example .env

# Run database migrations
npx prisma migrate deploy

# Start the development server
npm run dev
```

### 3. Setup the frontend

```bash
cd ../client
npm install

# Copy the example env file
cp .env.example .env
# Set VITE_BASEURL=http://localhost:3000

npm run dev
```

### 4. Open the app

Visit `http://localhost:5173` — the frontend connects to your local backend at `http://localhost:3000`.

---

## 🔑 Environment Variables

### Server (`server/.env`)

```env
# Database
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=verify-full"

# Auth
BETTER_AUTH_SECRET="your-32-char-secret"
BETTER_AUTH_URL="http://localhost:3000"
TRUSTED_ORIGINS="http://localhost:5173"

# AI — dual key setup for quota fallback
AI_API_KEY="your-primary-gemini-api-key"
AI_API_KEY_FINAL="your-backup-gemini-api-key"

# Images
PIXELS_API_KEY="your-pexels-api-key"

# App
NODE_ENV="development"
PORT=3000
```

### Client (`client/.env`)

```env
VITE_BASEURL="http://localhost:3000"
```

---

## 📡 API Reference

### Authentication (Better Auth)

```
POST   /api/auth/sign-up/email
POST   /api/auth/sign-in/email
POST   /api/auth/sign-out
GET    /api/auth/get-session
```

### User Routes (`/api/user`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/credits` | ✅ | Get current user's credit balance |
| POST | `/project` | ✅ | Create new project (costs 5 credits) |
| GET | `/project/:projectId` | ✅ | Get project with conversations & versions |
| GET | `/projects` | ✅ | List all user's projects |
| PUT | `/publish-toggle/:projectId` | ✅ | Toggle project publish status |
| POST | `/purchase-credits` | ✅ | Purchase credits via Stripe |
| GET | `/convo/:projectId` | ✅ | Get conversation history |

### Project Routes (`/api/project`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/revision/:projectId` | ✅ | Request AI revision (costs 2 credits) |
| PUT | `/save/:projectId` | ✅ | Save manual code edits |
| PUT | `/rollback/:projectId/:versionId` | ✅ | Rollback to a specific version |
| DELETE | `/delete/:projectId` | ✅ | Delete a project |
| GET | `/preview/:projectId` | ✅ | Get project preview data |
| GET | `/published` | ❌ | List all public projects |
| GET | `/published/:projectId` | ❌ | Get a public project's HTML code |

---

## 💳 Credits & Payment System

The platform uses a **credits-based consumption model**:

| Action | Credits |
|---|---|
| New account signup | +20 (free) |
| Create project | −5 |
| Request AI revision | −2 |
| Credit purchase (Stripe) | +varies by plan |

### How the safety mechanism works

1. User initiates a paid action (create / revise)
2. Server validates the user has sufficient credits
3. Credits are **atomically deducted** before the AI call begins
4. On **AI success** → version saved, response returned ✅
5. On **AI failure** → credits are **automatically refunded** via Prisma `increment` ♻️

This prevents double-charging and ensures users are only billed for successful generations, regardless of network issues or AI service outages.

### Stripe Integration

Credit purchases are handled via **Stripe Checkout**. The `POST /api/user/purchase-credits` endpoint creates a Stripe Checkout session. After successful payment, a Stripe webhook updates the user's credit balance and logs the transaction in the `Transaction` table.

> ⚠️ Stripe webhook endpoint and signing secret configuration required for production.

---

## 🌍 Deployment

### Backend → Render

1. Connect your GitHub repo to [Render](https://render.com)
2. Set **Root Directory** to `server`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `node dist/server.js`
5. Add all environment variables from `server/.env`

### Frontend → Vercel

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Set **Root Directory** to `client`
3. Set **Framework Preset** to `Vite`
4. Add environment variable: `VITE_BASEURL=https://ai-site-builder-ag8l.onrender.com`

### Database → Neon (PostgreSQL)

1. Create a free database at [neon.tech](https://neon.tech)
2. Copy the connection string into `DATABASE_URL` on Render
3. Run `npx prisma migrate deploy` from the server directory (or as a Render pre-deploy command)

---

## 🗺️ Roadmap

- [x] AI-powered site generation (Gemini multi-model)
- [x] Multi-model fallback with exponential backoff retry
- [x] Dual API key quota fallback
- [x] Pexels image integration
- [x] 3-stage prompt pipeline
- [x] Version control & one-click rollback
- [x] Public project publishing & gallery
- [x] Credits system with automatic refund on failure
- [x] Conversation history per project
- [ ] Stripe payment integration (in progress)
- [ ] Live code editor (Monaco / CodeMirror)
- [ ] Export project as ZIP
- [ ] Custom domain support for published sites
- [ ] Template library / starter kits
- [ ] Admin dashboard & analytics

---

## 📄 License

This project is licensed under the **ISC License**.

---

## 🙏 Acknowledgements

- [Google Gemini](https://deepmind.google/technologies/gemini/) — AI generation engine
- [Pexels](https://www.pexels.com/) — Free stock photography API
- [Better Auth](https://better-auth.com/) — Modern authentication framework
- [Neon](https://neon.tech/) — Serverless PostgreSQL
- [Prisma](https://www.prisma.io/) — Next-generation ORM
- [Radix UI](https://www.radix-ui.com/) — Accessible, unstyled component primitives

---

<div align="center">

**Built with ❤️ by [Biplab Ghosh](https://github.com/biplab-430)**

⭐ If you found this helpful, consider starring the repo!

</div>
