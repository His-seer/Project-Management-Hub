# PM Hub — Architecture Diagram

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                   │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                        Next.js App Router (React)                        │   │
│  │                                                                          │   │
│  │  ┌─────────────┐  ┌───────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │  Portfolio   │  │  Project      │  │  Settings    │  │  New       │  │   │
│  │  │  Dashboard   │  │  Dashboard    │  │  Page        │  │  Project   │  │   │
│  │  │  (page.tsx)  │  │  (/[id])      │  │  (/settings) │  │  (/new)    │  │   │
│  │  └─────────────┘  └───────┬───────┘  └──────────────┘  └────────────┘  │   │
│  │                           │                                              │   │
│  │              ┌────────────┴────────────────────────┐                     │   │
│  │              │     27 Project Module Pages         │                     │   │
│  │              │                                     │                     │   │
│  │              │  charter    │ plan      │ gantt     │                     │   │
│  │              │  wbs        │ raci      │ risks     │                     │   │
│  │              │  issues     │ changes   │ resources │                     │   │
│  │              │  estimates  │ kpis      │ roadmap   │                     │   │
│  │              │  governance │ funding   │ stakehold │                     │   │
│  │              │  comms      │ meetings  │ lessons   │                     │   │
│  │              │  decisions  │ assumpts  │ status-rpt│                     │   │
│  │              │  actions    │ baselines │ history   │                     │   │
│  │              │  completeness │ jira    │ confluence│                     │   │
│  │              └────────────────────────────────────┘                     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                        State Management (Zustand)                        │   │
│  │                                                                          │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │   │
│  │  │ ProjectStore │ │ AtlassianStr │ │  AiStore     │ │  UiStore     │   │   │
│  │  │              │ │              │ │              │ │              │   │   │
│  │  │ • projects{} │ │ • baseUrl    │ │ • provider   │ │ • sidebar    │   │   │
│  │  │ • hydrated   │ │ • email      │ │ • models     │ │ • theme      │   │   │
│  │  │ • addProject │ │ • apiToken   │ │ • setProvider│ │              │   │   │
│  │  │ • updateMeta │ │ • isConfigrd │ │ • setModel   │ │              │   │   │
│  │  │ • updateMod  │ │              │ │              │ │              │   │   │
│  │  │ • deleteProj │ │              │ │              │ │              │   │   │
│  │  │ • loadFromDb │ │              │ │              │ │              │   │   │
│  │  └──────┬───────┘ └──────────────┘ └──────────────┘ └──────────────┘   │   │
│  │         │                                                                │   │
│  │         │  Background sync on every write                                │   │
│  └─────────┼────────────────────────────────────────────────────────────────┘   │
│            │                                                                    │
│  ┌─────────┼────────────────────────────────────────────────────────────────┐   │
│  │         │           Shared Components                                    │   │
│  │         │                                                                │   │
│  │  ┌──────┴──────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│  │  │ DbProvider  │ │ EditableTable│ │ConfirmDialog │ │DataManagement│    │   │
│  │  │ (hydration) │ │ (CRUD grid)  │ │              │ │(export/imprt)│    │   │
│  │  └─────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │   │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│  │  │  Sidebar    │ │ ClientLayout │ │ThemeProvider  │ │   Toast      │    │   │
│  │  │  (nav)      │ │ (responsive) │ │ (dark mode)  │ │              │    │   │
│  │  └─────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐    │   │
│  │  │  Print Components: CharterPrint, GanttPrint, RiskRegisterPrint  │    │   │
│  │  │                    ScreenshotPrint, StatusReportPrint            │    │   │
│  │  └──────────────────────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP (fetch)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SERVER (Next.js API Routes)                             │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         /api/projects                                    │   │
│  │                                                                          │   │
│  │  GET  /api/projects          → loadAllProjects()  → all projects        │   │
│  │  POST /api/projects          → saveProject()      → create project      │   │
│  │  PUT  /api/projects/[id]     → saveProject()      → full project sync   │   │
│  │  PATCH /api/projects/[id]    → saveModule()       → per-module sync     │   │
│  │  DELETE /api/projects/[id]   → deleteProject()    → cascade delete      │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         /api/ai/* (8 routes)                             │   │
│  │                                                                          │   │
│  │  POST /ai/status-report      → Generate AI status report (SSE stream)   │   │
│  │  POST /ai/charter            → AI-assisted charter drafting             │   │
│  │  POST /ai/insights           → Project health insights                  │   │
│  │  POST /ai/risk-mitigation    → Risk mitigation suggestions              │   │
│  │  POST /ai/change-impact      → Change request impact analysis           │   │
│  │  POST /ai/stakeholder-strategy → Engagement plan generation             │   │
│  │  POST /ai/extract-actions    → Extract actions from meeting notes       │   │
│  │  POST /ai/lessons            → Lessons learned analysis                 │   │
│  │                                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐                   │   │
│  │  │  aiClient.ts — Multi-provider AI abstraction     │                   │   │
│  │  │                                                  │                   │   │
│  │  │  Providers:  Anthropic │ Google Gemini │ OpenAI   │                   │   │
│  │  │  Streaming:  SSE for real-time responses         │                   │   │
│  │  │  Config:     AiStore selects provider & model    │                   │   │
│  │  └──────────────────────────────────────────────────┘                   │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                    /api/jira/* & /api/confluence/*                        │   │
│  │                                                                          │   │
│  │  GET /jira/boards            → List Jira boards                         │   │
│  │  GET /jira/sprints?boardId=  → Active sprint + issues                   │   │
│  │  GET /jira/issues            → Search issues                            │   │
│  │  PUT /jira/issues/[key]      → Update issue status                      │   │
│  │  GET /jira/velocity          → Sprint velocity data                     │   │
│  │                                                                          │   │
│  │  GET /confluence/search      → Search Confluence pages                  │   │
│  │  GET /confluence/pages       → List pages in space                      │   │
│  │  GET /confluence/pages/[id]  → Get page content                         │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         /api/db/*                                         │   │
│  │                                                                          │   │
│  │  GET /db/migrate             → Create 25+ normalized tables             │   │
│  │  GET /db/reset               → Drop all tables (fresh start)            │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                      Library Layer (src/lib/)                            │   │
│  │                                                                          │   │
│  │  db.ts          → Neon serverless connection (sql + pool)               │   │
│  │  dbHelpers.ts   → loadProject, saveProject, saveModule, deleteProject   │   │
│  │                   Row↔Interface mappers for all 25+ tables              │   │
│  │  aiClient.ts    → Multi-provider AI client (Anthropic/Google/OpenAI)    │   │
│  │  jira.ts        → Jira REST API client                                  │   │
│  │  confluence.ts  → Confluence REST API client                            │   │
│  │  defaults.ts    → createDefaultProject() factory                        │   │
│  │  sampleData.ts  → Sample project data generator                         │   │
│  │  completeness.ts→ Project completeness scoring algorithm                │   │
│  │  ids.ts         → Unique ID generation (nanoid)                         │   │
│  │  printExport.ts → PDF/screenshot export utilities                       │   │
│  │  validateImport.ts → Import data validation                             │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ SQL (TLS)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     DATABASE (Neon Postgres 17 — AWS US East)                    │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                    Normalized Schema (25+ tables)                         │   │
│  │                                                                          │   │
│  │  CORE            │  PLANNING          │  EXECUTION         │ MONITORING  │   │
│  │  ────            │  ────────          │  ─────────         │ ──────────  │   │
│  │  projects ◄──┐   │  project_plans     │  gantt_tasks       │ kpis        │   │
│  │  charters    │   │  deliverables      │  resources         │ roadmap_items│  │
│  │              │   │  milestones        │  estimate_items    │ status_rpts │   │
│  │              │   │  budget_items      │  action_items      │ audit_log   │   │
│  │              │   │                    │                    │ baselines   │   │
│  │              │   │                    │                    │             │   │
│  │  RISK/ISSUE  │   │  GOVERNANCE        │  PEOPLE            │ COMMS       │   │
│  │  ──────────  │   │  ──────────        │  ──────            │ ─────       │   │
│  │  risks       │   │  governance_data   │  stakeholders      │ meetings    │   │
│  │  issues      │   │  decisions         │  raci_data         │ comm_items  │   │
│  │  assumptions │   │  funding           │  wbs_data          │ lessons     │   │
│  │  change_log  │   │  funding_phases    │                    │             │   │
│  │  change_reqs │   │                    │                    │             │   │
│  │              │   │                    │                    │             │   │
│  │  ◄───────────┴───┴────────────────────┴────────────────────┘             │   │
│  │  All child tables reference projects(id) ON DELETE CASCADE               │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘

                                      │
                         ┌────────────┼────────────┐
                         ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│  Atlassian   │ │  AI Providers│ │  Neon Auth       │
│  Cloud       │ │              │ │  (future)        │
│              │ │  • Anthropic │ │                  │
│  • Jira REST │ │    Claude    │ │  • Stack Auth    │
│  • Confluence│ │  • Google    │ │  • Email/OAuth   │
│    REST      │ │    Gemini    │ │  • Sessions      │
│              │ │  • OpenAI    │ │                  │
│              │ │    GPT-4o    │ │                  │
└──────────────┘ └──────────────┘ └──────────────────┘
```

## Data Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  User    │───▶│  React Page  │───▶│ Zustand Store│───▶│ API Route    │
│  Action  │    │  (onClick)   │    │ (updateModule│    │ (PUT/PATCH)  │
└──────────┘    └──────────────┘    │  + audit log)│    └──────┬───────┘
                                    └──────────────┘           │
                                           │                   ▼
                                    ┌──────┴───────┐    ┌──────────────┐
                                    │  Optimistic  │    │  dbHelpers   │
                                    │  UI Update   │    │  saveModule()│
                                    │  (instant)   │    └──────┬───────┘
                                    └──────────────┘           │
                                                               ▼
                                                        ┌──────────────┐
                                                        │  Neon Postgres│
                                                        │  (normalized) │
                                                        └──────────────┘
```

## AI Integration Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  User    │───▶│ "AI Suggest" │───▶│ /api/ai/*    │───▶│  aiClient.ts │
│  clicks  │    │  button on   │    │  route       │    │              │
│  AI btn  │    │  any module  │    │              │    │  Reads from  │
└──────────┘    └──────────────┘    └──────────────┘    │  AiStore:    │
                                           │            │  • provider  │
                                    ┌──────┴───────┐    │  • model     │
                                    │  SSE Stream  │    └──────┬───────┘
                                    │  back to UI  │           │
                                    │  (real-time) │           ▼
                                    └──────────────┘    ┌──────────────┐
                                                        │ Anthropic OR │
                                                        │ Google OR    │
                                                        │ OpenAI API   │
                                                        └──────────────┘
```

## Tech Stack Summary

| Layer        | Technology                              |
|-------------|------------------------------------------|
| Framework   | Next.js 16 (App Router, TypeScript)      |
| UI          | React 19, Tailwind CSS 4, Lucide Icons   |
| Charts      | Recharts                                 |
| State       | Zustand (4 stores, persist middleware)    |
| Database    | Neon Postgres 17 (serverless, 25+ tables)|
| AI          | Anthropic Claude / Google Gemini / OpenAI|
| Integrations| Jira REST API, Confluence REST API        |
| Print/Export| html2canvas, jsPDF                       |
| ID Gen      | nanoid                                   |
