<div align="center">

<img src="client/src/assets/logo.svg" alt="AI Site Builder Logo" height="60" />

# AI Site Builder

**Transform natural language into production-ready websites — powered by Google Gemini AI.**

[![Live Demo](https://img.shields.io/badge/🌐_Live_App-ai--site--builder--sandy.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://ai-site-builder-sandy.vercel.app/)
[![Backend API](https://img.shields.io/badge/🖥️_Backend_API-Render-46E3B7?style=for-the-badge&logo=render)](https://ai-site-builder-ag8l.onrender.com)
[![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Table of Contents

1. [Overview](#-overview)
2. [Live Demo](#-live-demo)
3. [Key Features](#-key-features)
4. [Architecture & Design Decisions](#️-architecture--design-decisions)
   - [Why a Monolith over Microservices?](#why-a-monolith-over-microservices)
   - [Why Express over Next.js API Routes?](#why-express-over-nextjs-api-routes)
   - [Why Prisma over raw SQL / other ORMs?](#why-prisma-over-raw-sql--other-orms)
   - [Why Better Auth over NextAuth / Clerk?](#why-better-auth-over-nextauth--clerk)
   - [Why Gemini over OpenAI GPT?](#why-gemini-over-openai-gpt)
   - [Why Vite over Create-React-App?](#why-vite-over-create-react-app)
   - [Why Neon PostgreSQL over MongoDB?](#why-neon-postgresql-over-mongodb)
5. [AI Pipeline Deep Dive](#-ai-pipeline-deep-dive)
6. [Security Architecture](#-security-architecture)
7. [Tech Stack](#️-tech-stack)
8. [Project Structure](#-project-structure)
9. [Database Schema](#️-database-schema)
10. [Getting Started (Local Development)](#-getting-started-local-development)
11. [Environment Variables](#-environment-variables)
12. [API Reference](#-api-reference)
13. [Credits & Payment System](#-credits--payment-system)
14. [Deployment](#-deployment)
    - [Database → Neon (PostgreSQL)](#1-database--neon-postgresql)
    - [Backend → Render](#2-backend--render)
    - [Frontend → Vercel](#3-frontend--vercel)
    - [Stripe Webhook Configuration](#4-stripe-webhook-configuration)
    - [Environment Variables Checklist](#5-environment-variables-checklist)
15. [Roadmap](#️-roadmap)
16. [Acknowledgements](#-acknowledgements)

---

## 🌟 Overview

**AI Site Builder** is a full-stack SaaS platform that lets users describe a website in plain English and receive a fully functional, responsive `HTML + CSS + JS` website — generated in seconds by Google Gemini AI.

Users can:
- ✍️ Describe a site in natural language and get a production-ready result
- 🔄 Iteratively refine it through a built-in **chat interface** — the AI preserves context and applies targeted changes
- 🕒 Roll back to any previous **versioned snapshot** at any time
- 🌐 **Publish** their site to a public community gallery with a shareable URL
- 💳 Manage consumption through a **credits-based billing system** backed by Stripe

> Built as a carefully architected **MERN-family** full-stack application — React + Vite frontend deployed to Vercel, Express + TypeScript backend deployed to Render, PostgreSQL on Neon.

---

## 🔗 Live Demo

| Service | URL | Platform |
|---|---|---|
| 🌐 Frontend | [https://ai-site-builder-sandy.vercel.app/](https://ai-site-builder-sandy.vercel.app/) | Vercel |
| 🖥️ Backend API | [https://ai-site-builder-ag8l.onrender.com](https://ai-site-builder-ag8l.onrender.com) | Render |

---

## ✨ Key Features

### 🤖 AI-Powered Site Generation
- Type a description in plain English → get a complete, styled, responsive HTML website
- **3-stage AI pipeline**: Prompt enhancement → Image keyword extraction → Full code generation
- Generated code includes real Pexels photography — no placeholder images
- **Iterative refinement**: Request changes via chat; the AI has the full conversation history, so it understands what to keep and what to change

### 🔄 Multi-Model Fallback with Retry Logic
- **Primary**: `gemini-2.5-flash` (best quality)
- **Fallback 1**: `gemini-2.5-flash-lite` (faster, lower cost)
- **Fallback 2**: `gemini-2.0-flash` (last resort)
- Each model gets up to **3 retries with exponential backoff** on 503 (Service Unavailable)
- **Dual API key failover** at the SDK level — if the primary Gemini key hits its quota (429), requests are transparently retried using a backup key

### 🖼️ Smart Pexels Image Integration
- Gemini extracts a 1–2 word image keyword from your prompt
- That keyword is sent to the Pexels API to fetch 6–8 real, high-resolution photos
- URLs are injected directly into the HTML generation prompt — so every generated site looks production-ready from day one

### 📝 Version Control & Rollback
- Every generation and revision is saved as a **versioned snapshot** (`Version` model)
- Full **conversation history** per project is persisted (`Conversation` model)
- One-click rollback to any version — the current code pointer (`current_version_index`) is updated atomically

### 🔐 Authentication & Authorization
- **Email/password authentication** powered by Better Auth
- Session tokens stored in **HTTP-only, secure, SameSite cookies** — not localStorage
- Sessions enforced server-side via a `protect` middleware on every authenticated route
- User data is strictly isolated — every query is scoped to `req.userId` injected by the middleware

### 💳 Credits System & Stripe Payments
- New users start with **20 free credits**
- Credit deduction is **atomic** — uses `updateMany` with a `WHERE credits >= N` clause, eliminating TOCTOU race conditions
- Failed AI generations **automatically refund** credits via Prisma `increment`
- Stripe Checkout integration with a **webhook idempotency guard** — prevents double-crediting on Stripe retries

### 🌐 Publishing & Community Gallery
- Toggle any project between private and publicly accessible with one click
- Published projects appear in a community gallery page
- Public project endpoints only expose `author.name` — emails and credit balances are never leaked

---

## 🏗️ Architecture & Design Decisions

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT (Vercel)                      │
│              React 19 + Vite + TypeScript                │
│         Tailwind CSS v4 · React Router v7 · Axios        │
│         Better Auth UI · Sonner · Lucide React           │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS / REST API (credentials: true)
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    SERVER (Render)                        │
│              Express 5 + TypeScript (ESM)                │
│                                                          │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │   Helmet     │  │  CORS Guard   │  │  Rate Limiter│  │
│  │ (HTTP sec.)  │  │  (allowlist)  │  │ (express-r-l)│  │
│  └──────────────┘  └───────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │              Better Auth Handler                  │    │
│  │     /api/auth/* · HTTP-only Cookie Sessions      │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌───────────────────┐  ┌─────────────────────────────┐  │
│  │   UserController  │  │    ProjectController         │  │
│  │   (project CRUD,  │  │    (revision, rollback,      │  │
│  │   credits, stripe)│  │     publish, preview)        │  │
│  └───────────────────┘  └─────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │               AI Pipeline Layer                   │    │
│  │   Gemini.ts (dual-key) → Fallback.ts (3-model)   │    │
│  │   → helperImage.ts (Pexels) → Code Generation    │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │               Prisma ORM v7                       │    │
│  │          @prisma/adapter-pg · Neon PG             │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│               PostgreSQL (Neon Serverless)                │
│  User · WebsiteProject · Conversation · Version          │
│  Transaction · Session · Account · Verification          │
└─────────────────────────────────────────────────────────┘
```

### Why a Monolith over Microservices?

| Factor | Decision |
|---|---|
| **Team size** | Single developer — microservices add infrastructure overhead (service discovery, inter-service auth, distributed tracing) with no benefit at this scale |
| **Tight data coupling** | User auth, credits, projects, and conversations all reference the same user record — splitting them across services would require distributed transactions or eventual consistency |
| **Deployment cost** | One Render instance vs. multiple services with separate billing, networking, and cold-start management |
| **Development velocity** | Monoliths are dramatically faster to build, debug, and iterate when scope is well-understood |
| **Modular foundation** | The codebase is already structured as `Controllers / Routes / Middlewares / lib` — extracting into microservices later is straightforward if traffic demands it |

> **Rule of thumb**: Start monolith-first. Extract services when you have *measured* need — not speculative need.

---

### Why Express over Next.js API Routes?

Next.js API routes work well for small BFFs (Backend-For-Frontend), but this project needed:

- **Raw body access** for Stripe webhook signature verification (requires `express.raw()` before JSON parsing — impossible in Next.js route handlers without custom middleware)
- **Fine-grained middleware ordering** — Helmet before CORS, CORS before Better Auth, Better Auth before `express.json()`. Next.js doesn't expose the underlying router at this level
- **WebSocket readiness** for potential future features (live generation streaming)
- **`trust proxy` configuration** needed for Render's reverse proxy to correctly read client IPs for rate limiting

Express 5 with TypeScript ESM gives complete control over the middleware pipeline.

---

### Why Prisma over raw SQL / other ORMs?

| Comparison | Reason |
|---|---|
| **vs. raw `pg`** | Prisma provides a type-safe query builder and auto-generated types that match the schema — no chance of SQL injection from string concatenation, no manual type casting |
| **vs. Drizzle** | Prisma's `schema.prisma` is far more readable for a single developer; migrations are automated; the Prisma Studio GUI is useful during development |
| **vs. TypeORM** | TypeORM's decorator-based approach requires more boilerplate and has had long-standing issues with complex query types. Prisma's query API is significantly cleaner |
| **Atomic operations** | `updateMany` with a `WHERE` clause (e.g., `credits >= 5`) performs the check and decrement atomically in a single SQL statement, eliminating race conditions that two separate `findUnique` + `update` calls would have |

The generated Prisma client (`../generated/prisma`) uses `@prisma/adapter-pg` for native PostgreSQL connection pooling, which is important for a serverless deployment on Neon.

---

### Why Better Auth over NextAuth / Clerk?

| Option | Why Not? |
|---|---|
| **NextAuth (Auth.js)** | Tightly coupled to Next.js routing conventions. Using it with a separate Express server requires complex adapter work and loses the biggest benefits |
| **Clerk** | Excellent DX but adds a monthly cost, an external vendor dependency for every auth check, and limits control over session storage and cookie configuration |
| **Better Auth** | Framework-agnostic, self-hosted, works natively with Express and Prisma via `prismaAdapter`. Full control over cookie attributes (`httpOnly`, `secure`, `sameSite`). Free and open source |

Better Auth also ships with a companion `@daveyplate/better-auth-ui` React library that provides pre-built sign-in/sign-up/settings UI components, saving significant front-end development time.

---

### Why Gemini over OpenAI GPT?

| Factor | Decision |
|---|---|
| **Free tier** | Google Gemini's free tier (via Google AI Studio) is significantly more generous for development — no credit card required to start |
| **Context window** | `gemini-2.5-flash` supports a 1M token context window, making it capable of handling very large HTML generation prompts with full conversation history |
| **Speed** | Flash-family models generate large HTML payloads (5,000–15,000 tokens) faster than comparable GPT-4o configurations |
| **Cost at scale** | Gemini 2.5 Flash is substantially cheaper per output token than GPT-4o for equivalent quality |
| **Fallback flexibility** | Three distinct Gemini models are used in cascade (`2.5-flash` → `2.5-flash-lite` → `2.0-flash`), providing resilience without switching vendors or changing API structure |

> Note: The OpenAI SDK is also installed (`openai` package) for potential future use or A/B testing — it is not currently invoked in any code path.

---

### Why Vite over Create-React-App?

Create React App is no longer actively maintained. Vite is the current industry standard for React SPA development:

- **Build speed**: Vite's native ESM dev server starts in < 300ms; CRA's webpack-based server takes 15–30s on a large codebase
- **Tailwind CSS v4 compatibility**: Tailwind v4 ships as a Vite plugin (`@tailwindcss/vite`) — this is the official integration path and eliminates the PostCSS configuration layer
- **Path aliases**: `@/` → `./src/` is configured in `vite.config.ts` via the `resolve.alias` option, making imports clean and refactor-safe
- **Production builds**: Vite/Rollup produces significantly smaller bundles than CRA/webpack for equivalent codebases

---

### Why Neon PostgreSQL over MongoDB?

| Factor | Decision |
|---|---|
| **Relational integrity** | The data model has genuine foreign key relationships: `User → WebsiteProject → [Conversation, Version] → Transaction`. A relational schema enforces these at the database level |
| **Atomic operations** | SQL's `UPDATE ... WHERE credits >= 5` is a single atomic statement. Achieving equivalent behavior in MongoDB requires two-phase commits or the `findOneAndUpdate` operator with careful use — less intuitive |
| **Cascade deletes** | Prisma + PostgreSQL cascade deletes on `Version` and `Conversation` when a `WebsiteProject` is deleted, with zero application-level code |
| **Neon specifically** | Neon is a serverless PostgreSQL platform with a generous free tier (0.5 GB storage, always-on). It uses the standard `pg` wire protocol, so the switch from local PostgreSQL to Neon requires only a connection string change |

---

## 🤖 AI Pipeline Deep Dive

Every site generation and revision runs through a **3-stage pipeline**:

```
User Prompt
     │
     ▼
┌─────────────────────────────────────┐
│  Stage 1: Prompt Enhancement         │
│                                      │
│  Input : raw user description        │
│  Output: detailed, structured spec   │
│                                      │
│  Gemini rewrites vague prompts like  │
│  "portfolio site" into a full brief  │
│  with sections, color palette, tone  │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│  Stage 2: Image Keyword Extraction   │
│                                      │
│  Input : enhanced prompt             │
│  Output: 1-2 word Pexels query       │
│                                      │
│  Example: "modern tech startup"      │
│  → "technology office"               │
│  → Fetch 6 HD photos from Pexels     │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│  Stage 3: HTML Code Generation       │
│                                      │
│  Input : enhanced prompt             │
│          + 6 real Pexels image URLs  │
│          + conversation history      │
│  Output: complete HTML/CSS/JS file   │
│                                      │
│  Uses Tailwind CDN for inline        │
│  styling, real images, full layout   │
└──────────────────┬──────────────────┘
                   │
                   ▼
     Save Version → Return projectId → Client navigates to editor
```

### Multi-Model Fallback Architecture

```typescript
// lib/Fallback.ts — actual production code
const models = [
  "gemini-2.5-flash",      // Primary — best quality, highest capability
  "gemini-2.5-flash-lite", // Fallback 1 — faster, cheaper
  "gemini-2.0-flash",      // Fallback 2 — last resort
];

for (const model of models) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await ai.models.generateContent({ model, ... });
    } catch (error) {
      if (error.status === 503 && attempt < 3) {
        // Transient overload — wait and retry SAME model
        await sleep(attempt * 3000); // 3s, 6s backoff
        continue;
      }
      // Fatal error (400, 429) or retries exhausted — try NEXT model
      break;
    }
  }
}
throw new Error("Critical Failure: All models exhausted");
```

### Dual API Key Failover

```typescript
// Configs/Gemini.ts — transparent key-level failover
const primaryClient = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });
const fallbackClient = new GoogleGenAI({ apiKey: process.env.AI_API_KEY_FINAL });

// If primary key hits 429 (quota), transparently switch to backup key
if (isRateLimitOrBusy(error) && process.env.AI_API_KEY_FINAL) {
  return await fallbackClient.models.generateContent(params);
}
```

This creates a **two-dimensional resilience matrix**: 2 API keys × 3 models × 3 retries = up to 18 attempts before the request fails.

---

## 🔒 Security Architecture

| Layer | Implementation |
|---|---|
| **HTTP Security Headers** | `helmet` middleware with `crossOriginResourcePolicy: cross-origin` to support iframe previews |
| **CORS** | Strict allowlist from `TRUSTED_ORIGINS` env var — no wildcard origins |
| **Authentication** | Better Auth sessions via `HTTP-only`, `Secure`, `SameSite=none` (production) cookies |
| **Authorization** | Every protected route validates session server-side via `protect` middleware |
| **Rate Limiting** | `express-rate-limit` — 5 req/min on AI endpoints, 3 req/min on purchase endpoint |
| **Credit Race Conditions** | Atomic `updateMany WHERE credits >= N` — no separate read-then-write |
| **Stripe Webhook** | Signature verification via `stripe.webhooks.constructEvent` + idempotency guard via `updateMany WHERE isPaid = false` |
| **PII Leakage Prevention** | Public endpoints use Prisma `select` to expose only `user.name` — never email, credits, or verified status |
| **Origin Spoofing Prevention** | Stripe redirect URLs built from `process.env.FRONTEND_URL` — not the spoofable `req.headers.origin` |

---

## 🛠️ Tech Stack

### Frontend (`client/`)

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.0 | UI framework |
| TypeScript | ~5.9.3 | Type safety across the entire frontend |
| Vite | ^7.2.4 | Build tool, dev server, bundler |
| Tailwind CSS | ^4.1.18 | Utility-first CSS framework (v4 Vite plugin integration) |
| React Router DOM | ^7.11.0 | Client-side routing |
| Axios | ^1.13.5 | HTTP client with base URL configuration |
| Better Auth UI | ^3.3.15 | Pre-built auth components (sign-in, sign-up, account settings) |
| Sonner | ^2.0.7 | Toast notifications |
| Lucide React | ^0.562.0 | Icon library |
| Radix UI | ^1.5.0 | Accessible, headless component primitives |
| `tw-animate-css` | ^1.4.0 | Animation utilities for Tailwind v4 |
| `next-themes` | ^0.4.6 | Dark/light mode theming |

### Backend (`server/`)

| Technology | Version | Purpose |
|---|---|---|
| Node.js | >= 20.19.0 | Runtime |
| Express | ^5.2.1 | HTTP server framework |
| TypeScript | ^5.9.3 | Type safety; compiled to `dist/` for production |
| `tsx` | ^4.21.0 | TypeScript execution for development (`nodemon --exec tsx`) |
| Prisma ORM | ^7.3.0 | Database access layer, schema management, migrations |
| `@prisma/adapter-pg` | ^7.3.0 | Native PostgreSQL connection pooling adapter |
| `pg` | ^8.17.2 | PostgreSQL Node.js driver |
| Better Auth | ^1.4.17 | Authentication (email/password, sessions, cookie management) |
| `@google/genai` | ^2.8.0 | Official Google Gemini SDK |
| `openai` | ^6.17.0 | OpenAI SDK (installed, reserved for future use) |
| Stripe | ^22.2.2 | Payment processing SDK |
| Helmet | ^8.2.0 | HTTP security headers middleware |
| `express-rate-limit` | ^8.5.2 | API rate limiting middleware |
| CORS | ^2.8.6 | Cross-Origin Resource Sharing configuration |
| `dotenv` | ^17.2.3 | Environment variable loading |

### Infrastructure

| Service | Role |
|---|---|
| [Vercel](https://vercel.com) | Frontend hosting with global CDN, automatic CI/CD from GitHub |
| [Render](https://render.com) | Backend hosting — web service with auto-deploy from GitHub |
| [Neon](https://neon.tech) | Serverless PostgreSQL — the database layer |
| [Stripe](https://stripe.com) | Payment processing and webhook delivery |
| [Pexels](https://pexels.com/api) | Free stock photography API for image injection |
| [Google AI Studio](https://aistudio.google.com) | Gemini API key management |

---

## 📁 Project Structure

```
AI-Site-Builder/
│
├── client/                              # React + Vite frontend
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── assets/
│   │   │   ├── assets.ts               # Exported assets, pricing plans, dummy data
│   │   │   └── logo.svg
│   │   ├── componenets/                # Application components
│   │   │   ├── EditorPanel.tsx         # Visual element editor (click-to-edit in iframe)
│   │   │   ├── Footer.tsx              # Page footer
│   │   │   ├── Loaderstep.tsx          # AI generation progress stepper
│   │   │   ├── Navbar.tsx              # Top navigation bar with credits badge
│   │   │   ├── ProjectPreview.tsx      # Iframe-based live preview component
│   │   │   ├── Sidebar.tsx             # Chat sidebar (messages + versions + revision form)
│   │   │   └── Typewriter.tsx          # Animated typewriter for AI responses
│   │   ├── components/
│   │   │   └── ui/                     # shadcn/Radix UI primitives
│   │   │       ├── alert-dialog.tsx
│   │   │       ├── button.tsx
│   │   │       └── sonner.tsx
│   │   ├── config/
│   │   │   └── Axios.ts                # Axios instance with VITE_BASEURL + credentials
│   │   ├── lib/
│   │   │   └── auth-client.ts          # Better Auth client configuration
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   └── AuthPage.tsx        # Renders Better Auth UI views by route param
│   │   │   ├── Community.tsx           # Public project gallery
│   │   │   ├── Home.tsx                # Landing page with AI prompt form
│   │   │   ├── Loading.tsx             # Post-payment credit polling page
│   │   │   ├── MyProjects.tsx          # User's project dashboard
│   │   │   ├── Preview.tsx             # Full-screen project preview
│   │   │   ├── Pricing.tsx             # Pricing plans + Stripe checkout trigger
│   │   │   ├── Projects.tsx            # Main editor view (Sidebar + Preview)
│   │   │   ├── Settings.tsx            # Account settings (Better Auth UI cards)
│   │   │   └── View.tsx                # Public project viewer
│   │   ├── types/
│   │   │   └── index.ts                # Shared TypeScript interfaces (Project, Message, Version)
│   │   ├── App.tsx                     # Root component with routing and navbar visibility logic
│   │   ├── index.css                   # Global styles, Tailwind v4 import, custom animations
│   │   ├── main.tsx                    # React root with BrowserRouter + Providers
│   │   └── providers.tsx               # AuthUIProvider wrapper
│   ├── index.html                      # HTML shell (dark mode class on <html>)
│   ├── vite.config.ts                  # Vite config with React plugin, Tailwind, @ alias
│   └── package.json
│
└── server/                              # Express + TypeScript backend
    ├── Configs/
    │   ├── Gemini.ts                   # Dual-key Gemini client with rate-limit failover
    │   └── OpenAi.ts                   # OpenAI client (reserved)
    ├── Controllers/
    │   ├── ProjectController.ts        # revision, rollback, publish, delete, preview, save
    │   ├── StripeWebhook.ts            # Webhook handler with signature verification + idempotency
    │   └── UserController.ts           # project CRUD, credits, conversation, purchase credits
    ├── lib/
    │   ├── auth.ts                     # Better Auth configuration with Prisma adapter
    │   ├── Fallback.ts                 # 3-model fallback + per-model retry with backoff
    │   ├── helperImage.ts              # Pexels API image search helper
    │   └── prisma.ts                   # Prisma client singleton
    ├── Middlewares/
    │   ├── auth.ts                     # `protect` middleware — validates session, injects userId
    │   └── rateLimiter.ts              # aiLimiter (5/min) + purchaseLimiter (3/min)
    ├── routes/
    │   ├── ProjectRoute.ts             # /api/project/* route definitions
    │   └── UserRoute.ts                # /api/user/* route definitions
    ├── Types/
    │   └── express.d.ts                # Augments Express Request with req.userId: string
    ├── prisma/
    │   ├── schema.prisma               # Database schema (all models)
    │   └── migrations/                 # Migration history (auto-generated)
    ├── generated/
    │   └── prisma/                     # Auto-generated Prisma client (gitignored in prod)
    ├── dist/                           # Compiled JS output (tsc → node dist/server.js)
    ├── server.ts                       # Entry point — middleware stack, route mounting
    ├── prisma.config.ts                # Prisma configuration file
    ├── tsconfig.json                   # TypeScript compiler options (ESM, nodenext)
    └── package.json
```

---

## 🗄️ Database Schema

```prisma
// Actual schema.prisma

model User {
  id            String   @id
  email         String
  name          String
  credits       Int      @default(20)     // Free credits on signup
  totalCreation Int      @default(0)       // Total projects ever created
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  emailVerified Boolean  @default(false)

  projects     WebsiteProject[]
  sessions     Session[]
  accounts     Account[]
  transactions Transaction[]
}

model WebsiteProject {
  id                    String  @id @default(uuid())
  name                  String                          // First 47 chars of prompt
  initial_prompt        String                          // Full original prompt
  current_code          String?                         // Current active HTML (O(1) access)
  current_version_index String  @default("")            // Points to active Version.id
  userId                String
  isPublished           Boolean @default(false)

  conversation Conversation[]  // Chat history
  versions     Version[]       // Code snapshots
  user         User            @relation(...)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role { user  assistant }

model Conversation {
  id        String   @id @default(uuid())
  role      Role                            // Mirrors LLM message format
  content   String
  timestamp DateTime @default(now())
  projectId String
  project   WebsiteProject @relation(..., onDelete: Cascade)
}

model Version {
  id          String   @id @default(uuid())
  code        String                          // Full HTML snapshot
  description String?
  timestamp   DateTime @default(now())
  projectId   String
  project     WebsiteProject @relation(..., onDelete: Cascade)
}

model Transaction {
  id        String   @id @default(uuid())
  isPaid    Boolean  @default(false)          // Idempotency flag for webhook
  planId    String
  amount    Float
  credits   Int                               // Credits to grant on payment
  userId    String
  // ...timestamps, relations
}
```

**Key design decisions:**

- `current_code` stored directly on `WebsiteProject` — fetching the preview is a single O(1) query with no join
- `current_version_index` is a simple string FK to `Version.id` — rollback is just updating this pointer
- `Conversation.role` uses an enum that mirrors the LLM's `user/assistant` format — history can be replayed directly into the Gemini API
- Cascade deletes on `Conversation` and `Version` when a project is deleted — no orphaned data, no cleanup jobs needed
- `Transaction.isPaid` starts as `false` and is atomically flipped to `true` by the webhook — serves as an idempotency key

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- **Node.js** >= 20.19.0 (`node -v` to check)
- **npm** >= 10.x
- A **PostgreSQL** database — [Neon free tier](https://neon.tech) is recommended
- A **Google Gemini API key** — [Get one free at Google AI Studio](https://aistudio.google.com/)
- A **Pexels API key** — [Get one free at Pexels](https://www.pexels.com/api/)
- *(Optional)* A **Stripe account** for payment testing

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/biplab-430/ai-site-builder.git
cd ai-site-builder
```

---

### Step 2 — Setup the Backend

```bash
cd server
npm install
```

Create your `.env` file (see [Environment Variables](#-environment-variables) for all required values):

```bash
# Create server/.env and fill in your values
cp .env.example .env   # or create it manually
```

Run database migrations:

```bash
npx prisma migrate deploy
```

> If this is a fresh setup, use `npx prisma migrate dev` instead to also generate migration files.

Generate the Prisma client:

```bash
npx prisma generate
```

Start the development server:

```bash
npm run server   # nodemon --exec tsx server.ts  (hot-reload)
# or
npm run start    # tsx server.ts (single run)
```

The backend will be available at `http://localhost:3000`.

---

### Step 3 — Setup the Frontend

```bash
cd ../client
npm install
```

Create your `.env` file:

```bash
# client/.env
VITE_BASEURL=http://localhost:3000
```

Start the Vite dev server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

### Step 4 — Open the App

Visit [http://localhost:5173](http://localhost:5173). Sign up for an account — you will receive **20 free credits** to start creating projects.

---

## 🔑 Environment Variables

### Server (`server/.env`)

```env
# ── Database ──────────────────────────────────────────────────────────────────
# Get this from your Neon dashboard → Connection Details → Pooled connection string
DATABASE_URL="postgresql://user:password@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=verify-full"

# ── Authentication ────────────────────────────────────────────────────────────
# Generate a strong random secret: openssl rand -hex 32
BETTER_AUTH_SECRET="your-32-char-minimum-secret-here"
# The URL where your backend is running (no trailing slash)
BETTER_AUTH_URL="http://localhost:3000"
# Comma-separated list of allowed frontend origins
TRUSTED_ORIGINS="http://localhost:5173"
# Used for safe Stripe redirect URLs (prevents Origin header spoofing)
FRONTEND_URL="http://localhost:5173"

# ── AI (Google Gemini) ────────────────────────────────────────────────────────
# Primary Gemini API key — get from https://aistudio.google.com/
AI_API_KEY="AIza..."
# Backup Gemini API key — used automatically if primary hits quota (429)
AI_API_KEY_FINAL="AIza..."

# ── Stock Photography ─────────────────────────────────────────────────────────
# Get from https://www.pexels.com/api/
PIXELS_API_KEY="your-pexels-api-key"

# ── Stripe (required for payment features) ───────────────────────────────────
# Get from Stripe Dashboard → Developers → API Keys
STRIPE_SECRET_KEY="sk_test_..."
# Get after creating a webhook endpoint in Stripe Dashboard
STRIPE_WEBHOOK_SECRET="whsec_..."

# ── App ───────────────────────────────────────────────────────────────────────
NODE_ENV="development"
PORT=3000
```

### Client (`client/.env`)

```env
# The base URL of your backend API server
VITE_BASEURL="http://localhost:3000"
```

---

## 📡 API Reference

### Authentication — Better Auth (`/api/auth/*`)

Better Auth handles these automatically. Standard endpoints:

```
POST   /api/auth/sign-up/email      Register with email + password
POST   /api/auth/sign-in/email      Sign in with email + password
POST   /api/auth/sign-out           End session and clear cookie
GET    /api/auth/get-session        Get current session data
DELETE /api/auth/delete-account     Delete user account
```

---

### Stripe Webhook (`/api/stripe`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/stripe` | Stripe signature | Receives `checkout.session.completed` events, verifies signature, grants credits idempotently |

---

### User Routes (`/api/user/*`)

All routes require authentication via session cookie.

| Method | Endpoint | Rate Limit | Description |
|---|---|---|---|
| `GET` | `/credits` | — | Get current user's credit balance |
| `GET` | `/project/:projectId` | — | Get project with full conversation and version history |
| `GET` | `/projects` | — | List all projects belonging to the authenticated user |
| `PUT` | `/publish-toggle/:projectId` | — | Toggle project's `isPublished` status |
| `GET` | `/convo/:projectId` | — | Get conversation history for a project |
| `POST` | `/project` | **5 req/min** | Create a new project (costs 5 credits, triggers full AI pipeline) |
| `POST` | `/purchase-credits` | **3 req/min** | Initiate a Stripe Checkout session for credit purchase |

---

### Project Routes (`/api/project/*`)

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/revision/:projectId` | ✅ | **5 req/min** | Request an AI revision using chat context (costs 5 credits) |
| `PUT` | `/save/:projectId` | ✅ | — | Save manual code edits from the editor panel |
| `PUT` | `/rollback/:projectId/:versionId` | ✅ | — | Restore a specific version as the current code |
| `DELETE` | `/delete/:projectId` | ✅ | — | Permanently delete a project and all associated data |
| `GET` | `/preview/:projectId` | ✅ | — | Get project preview data |
| `GET` | `/published` | ❌ Public | — | List all published projects (only name, prompt, author name exposed) |
| `GET` | `/published/:projectId` | ❌ Public | — | Get the HTML code of a specific published project |

---

## 💳 Credits & Payment System

### Pricing Plans

| Plan | Price | Credits | Approximate Usage |
|---|---|---|---|
| **Signup Bonus** | Free | 20 | ~4 new projects |
| **Basic** | $5 | 100 | ~20 projects |
| **Pro** | $19 | 400 | ~80 projects |
| **Enterprise** | $49 | 1,000 | ~200 projects |

### Credit Consumption

| Action | Credit Cost |
|---|---|
| Create new project | −5 credits |
| AI revision / chat | −5 credits |
| Manual code save | Free |
| Rollback to version | Free |
| Publish / unpublish | Free |

### Payment Flow

```
User clicks "Buy Now" on Pricing page
         │
         ▼
Pricing.tsx saves current credit balance → sessionStorage (baseline)
         │
         ▼
POST /api/user/purchase-credits
  → Stripe.checkout.sessions.create()
  → Returns payment_link URL
  → Creates Transaction record (isPaid: false)
         │
         ▼
User completes Stripe Checkout
         │
         ▼
Stripe sends POST /api/stripe webhook
  → Verify stripe-signature header
  → Handle checkout.session.completed event
  → prisma.transaction.updateMany({ where: { id, isPaid: false } })
  → If count > 0: credit user's account
  → Return 200 { received: true }
         │
         ▼
User lands on /loading page
  → Polls GET /api/user/credits every 2 seconds
  → Detects credits increased above baseline
  → Navigates to home — credits confirmed ✅
```

**Idempotency guarantee**: The `updateMany WHERE isPaid = false` clause ensures that even if Stripe retries the webhook multiple times (which it will, on timeouts), the user is only credited once.

---

## 🚀 Deployment

The project is deployed as two independent services that communicate over HTTPS.

```
GitHub Repository
       │
       ├──────────────────────────────────────┐
       ▼                                       ▼
  Vercel (Frontend)                    Render (Backend)
  /client directory                    /server directory
  npm run build                        npm install && tsc
  Serves dist/ as static SPA           node dist/server.js
  Global CDN                           Connected to Neon PostgreSQL
```

---

### 1. Database → Neon (PostgreSQL)

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project and database
3. Navigate to **Connection Details** → select **Pooled connection**
4. Copy the connection string — it will look like:
   ```
   postgresql://user:password@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=verify-full
   ```
5. This becomes your `DATABASE_URL` environment variable on Render

> **Migrations**: On first deployment, run `npx prisma migrate deploy` as a one-time command from the Render shell, or add it as a pre-deploy command.

---

### 2. Backend → Render

1. Go to [render.com](https://render.com) and create a new **Web Service**
2. Connect your GitHub repository
3. Configure the service:

| Setting | Value |
|---|---|
| **Root Directory** | `server` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `node dist/server.js` |
| **Node Version** | 20.x |
| **Instance Type** | Free (or Starter for no cold starts) |

4. Add all environment variables from [Environment Variables → Server](#server-serverenv) in the Render dashboard **Environment** tab

> **Note**: On the Render free plan, the service sleeps after 15 minutes of inactivity. Cold starts take ~30 seconds. Upgrade to the Starter plan ($7/mo) to eliminate this.

---

### 3. Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) and import your GitHub repository
2. Configure the project:

| Setting | Value |
|---|---|
| **Root Directory** | `client` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

3. Add the environment variable:

| Key | Value |
|---|---|
| `VITE_BASEURL` | `https://your-backend-name.onrender.com` |

4. Click **Deploy**. Vercel will automatically redeploy on every push to `main`.

> **SPA Routing**: Vercel handles client-side routing automatically for Vite/React projects. No `vercel.json` rewrites are needed.

---

### 4. Stripe Webhook Configuration

For Stripe payments to credit users in production:

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Set the endpoint URL to: `https://your-backend.onrender.com/api/stripe`
4. Select the event: `checkout.session.completed`
5. After creation, reveal and copy the **Signing Secret** (`whsec_...`)
6. Add this as `STRIPE_WEBHOOK_SECRET` in your Render environment variables

> **Local testing**: Use the Stripe CLI to forward webhooks to your local server:
> ```bash
> stripe listen --forward-to localhost:3000/api/stripe
> ```

---

### 5. Environment Variables Checklist

Before going live, verify every variable is set in both Render and Vercel:

**Render (Backend)**

- [ ] `DATABASE_URL` — Neon pooled connection string
- [ ] `BETTER_AUTH_SECRET` — Strong random 32+ char secret
- [ ] `BETTER_AUTH_URL` — Your Render backend URL (e.g., `https://ai-site-builder-ag8l.onrender.com`)
- [ ] `TRUSTED_ORIGINS` — Your Vercel frontend URL (e.g., `https://ai-site-builder-sandy.vercel.app`)
- [ ] `FRONTEND_URL` — Same as `TRUSTED_ORIGINS` (used for Stripe redirects)
- [ ] `AI_API_KEY` — Primary Gemini API key
- [ ] `AI_API_KEY_FINAL` — Backup Gemini API key
- [ ] `PIXELS_API_KEY` — Pexels API key
- [ ] `STRIPE_SECRET_KEY` — Stripe secret key (`sk_live_...` for production)
- [ ] `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- [ ] `NODE_ENV` — `production`

**Vercel (Frontend)**

- [ ] `VITE_BASEURL` — Your Render backend URL

---

## 🗺️ Roadmap

### Completed ✅

- [x] AI-powered site generation (3-stage pipeline)
- [x] Multi-model fallback with exponential backoff
- [x] Dual API key quota failover
- [x] Real Pexels image integration
- [x] Version control with one-click rollback
- [x] Full conversation history per project
- [x] Public project publishing and community gallery
- [x] Credits system with automatic refund on AI failure
- [x] Atomic credit deduction (TOCTOU-safe)
- [x] Stripe Checkout integration with idempotent webhook
- [x] HTTP security headers (Helmet)
- [x] API rate limiting (express-rate-limit)
- [x] Visual element editor (click-to-edit in iframe)
- [x] Device preview modes (mobile, tablet, desktop)
- [x] Project download as HTML file

### Planned 📋

- [ ] Live code streaming (Server-Sent Events while AI generates)
- [ ] Monaco / CodeMirror inline code editor
- [ ] Export project as ZIP (HTML + extracted assets)
- [ ] Custom domain support for published sites
- [ ] Template library / starter kits
- [ ] Admin dashboard with usage analytics
- [ ] Social authentication (Google, GitHub via Better Auth)

---

## 🙏 Acknowledgements

| Technology | Role in this Project |
|---|---|
| [Google Gemini](https://deepmind.google/technologies/gemini/) | The AI backbone — 3-stage pipeline for generation and revision |
| [Pexels API](https://www.pexels.com/api/) | Free, high-quality stock photography injected into every generated site |
| [Better Auth](https://better-auth.com/) | Modern, framework-agnostic authentication with Prisma adapter |
| [Neon](https://neon.tech/) | Serverless PostgreSQL — free tier ideal for indie SaaS |
| [Prisma](https://www.prisma.io/) | Type-safe database access with automatic migration management |
| [Stripe](https://stripe.com/) | Payment processing and reliable webhook delivery |
| [Radix UI](https://www.radix-ui.com/) | Accessible, unstyled component primitives (AlertDialog, etc.) |
| [Vercel](https://vercel.com/) | Zero-config frontend hosting with global CDN and automatic CI/CD |
| [Render](https://render.com/) | Simple backend hosting with GitHub auto-deploy |

---

## 📄 License

This project is licensed under the **ISC License**. See the `LICENSE` file for details.

---

<div align="center">

Built with ❤️ by **[Biplab Ghosh](https://github.com/biplab-430)**

🌐 **Live App**: [https://ai-site-builder-sandy.vercel.app/](https://ai-site-builder-sandy.vercel.app/)

⭐ If this project helped you, consider giving it a star on GitHub!

</div>
