# Football Athlete AI

A holistic AI assistant for high school football athletes covering **Football Performance**, **Academic Excellence**, and **Life Organization**. The assistant provides data-driven, action-oriented guidance while respecting coach authority and helping athletes succeed in both sport and school.

---

## Project Vision

Build an AI companion that acts like a knowledgeable older teammate and young coaching assistant—direct, supportive, and grounded in the athlete's own data. The assistant helps with:

- **Football Performance** — Training, recovery, nutrition, sleep, mental preparation
- **Academic Excellence** — Time management, exam prep, study efficiency, balancing school and sport
- **Life Organization** — Daily routines, goal tracking, mental health, handling multiple obligations

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React + Vite |
| **Backend** | Node.js + Express |
| **AI** | Claude API (`@anthropic-ai/sdk`) |
| **Language** | TypeScript |
| **Data** | JSON (Phase 1) → PostgreSQL (later) |

---

## Folder Structure

```
football-ai-app/
├── config/                 # App configuration
├── data/
│   ├── raw/               # Raw data files
│   └── processed/         # Processed datasets
├── docs/
│   └── conversation_scripts.md
├── scripts/               # Build & utility scripts
├── src/
│   ├── client/            # React + Vite frontend
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── styles/
│   │   └── assets/
│   ├── server/            # Express API
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   └── middleware/
│   ├── ai/                # Claude API integration
│   │   ├── client.ts
│   │   └── prompts/
│   └── shared/            # Shared types & constants
│       ├── types/
│       └── constants/
├── tests/
│   ├── client/
│   └── server/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.server.json
├── vite.config.ts
└── .cursorrules
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ 
- **npm** (or pnpm, yarn)
- **Anthropic API key** for Claude

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=your_api_key_here
PORT=3000
```

### 3. Run development servers

```bash
npm run dev
```

This starts:
- **Client** (Vite) → http://localhost:5173
- **Server** (Express) → http://localhost:3000

API requests to `/api/*` are proxied from the client to the server.

### 4. Build for production

```bash
npm run build
npm run start
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client and server concurrently |
| `npm run dev:client` | Vite dev server only (port 5173) |
| `npm run dev:server` | Express server with hot reload (port 3000) |
| `npm run build` | Build client and server |
| `npm run build:client` | Vite production build |
| `npm run build:server` | Compile server TypeScript |
| `npm run preview` | Preview production client build |
| `npm run start` | Run compiled server (after build) |
| `npm run typecheck` | TypeScript check (no emit) |

---

## Development Workflow — Phase 1 Prototype

Phase 1 focuses on a working prototype with core chat and athlete data.

| Step | Task | Notes |
|------|------|-------|
| **1** | Chat UI component (React) | Build the conversation interface; wire up message state |
| **2** | Express API routes for athlete data | CRUD for athlete profile, preferences, history |
| **3** | Claude API integration | System prompt with voice/tone; pass athlete context into each request |
| **4** | Notification system | Proactive check-ins (sleep, stress, etc.)—can be simulated initially |
| **5** | Data persistence | JSON file storage in `data/`; structure ready for PostgreSQL migration |
| **6** | Testing | Validate with `docs/conversation_scripts.md` examples; iterate on tone |

### Phase 1 Deliverables

- [ ] Athlete can chat with the AI assistant
- [ ] Responses follow voice principles (see `.cursorrules`)
- [ ] Athlete data persists (profile, sleep, preferences)
- [ ] Basic notification triggers (optional for prototype)
- [ ] Conversation scripts validated for all three domains

---

## References

- [Conversation Scripts](docs/conversation_scripts.md) — 17 dialogue examples across all domains
- [.cursorrules](.cursorrules) — AI voice, data structure, and implementation rules
- [Product Plan](docs/product_plan_v2.1.md) — Full product roadmap (if present)
