# Session Management — MARS-RFP

> Session and task lifecycle management for the standalone RFP Proposal Generator app.

---

## Overview

The MARS-RFP app uses a simplified session management system focused on task persistence and resumption. Unlike a multi-mode workflow platform, the session layer here serves a single purpose: **persist RFP proposal tasks so they survive browser reloads and can be resumed**.

Key capabilities:
- **Task persistence:** Tasks stored as JSON files in `~/Desktop/cmbdir/rfp/`
- **Resumable:** Incomplete tasks appear in the right-panel "Sessions" list
- **Cost tracking:** Per-stage cost tracked in task.json output_data
- **Auto-cleanup:** Completed tasks auto-transition and are removed from the recent list

---

## Project Structure

### Backend (Python/FastAPI)

```
backend/
├── routers/
│   ├── rfp.py                 # RFP REST endpoints (all task/stage endpoints)
│   ├── health.py              # Health check endpoint
│   ├── files.py               # File browsing endpoints
│   ├── credentials.py         # API key validation endpoints
│   └── models.py              # Model configuration endpoints
├── services/
│   ├── session_manager.py     # Session lifecycle management
│   └── pdf_extractor.py       # PDF text extraction
├── core/
│   ├── app.py                 # FastAPI app factory
│   ├── config.py              # Configuration
│   └── logging.py             # Logging setup
├── websocket/
│   └── events.py              # WebSocket event helper
└── main.py                    # Application entry point
```

### Frontend (Next.js/React/TypeScript — SPA)

```
mars-ui/
├── app/
│   ├── page.tsx               # SPA shell — Hero landing + Sessions panel
│   ├── layout.tsx             # Root layout with AppShell
│   └── providers.tsx          # Theme, WebSocket, Toast providers
├── components/
│   ├── rfp/                   # Setup, Execution, Review, Proposal panels
│   ├── tasks/
│   │   └── RfpProposalTask.tsx     # 7-stage wizard orchestrator
│   ├── layout/
│   │   ├── AppShell.tsx       # App shell (TopBar + FooterBar + content)
│   │   ├── TopBar.tsx         # Home + "MARS - RFP Proposal" + theme toggle + New Session
│   │   └── FooterBar.tsx      # Footer bar with version info
│   └── core/                  # Button, Stepper, Toast, etc.
├── hooks/
│   └── useRfpTask.ts          # State management, API calls, polling
├── contexts/
│   ├── WebSocketContext.tsx    # WebSocket state
│   └── ThemeContext.tsx        # Dark/light theme
└── types/
    └── rfp.ts                 # TypeScript interfaces
```

---

## Task Lifecycle

### States

```
┌─────────────┐
│   Created    │  (POST /api/rfp/create)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Executing   │  (7 stages running sequentially)
└──────┬──────┘
       │
       ├──────────────────┐
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│  Completed   │    │   Failed    │
└─────────────┘    └─────────────┘
```

### Task Status Values

| Status | Description |
|--------|-------------|
| `executing` | Task is active — at least one stage pending or running |
| `completed` | All 7 stages completed (auto-transition) |
| `failed` | A stage failed or task was stopped by user |

---

## Task Persistence

Tasks are stored as JSON files under `~/Desktop/cmbdir/rfp/`. The RFP router (`routers/rfp.py`) provides task-specific lifecycle management.

### Key Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/rfp/create` | Create task (auto-creates session) |
| `GET /api/rfp/recent` | List incomplete tasks for resume |
| `GET /api/rfp/{id}` | Full task state with all stages |
| `POST /api/rfp/{id}/stop` | Cancel running task |
| `DELETE /api/rfp/{id}` | Delete task and all files |

---

## Task Resume Flow

### How Resumption Works

```
User clicks a session in the right panel
    │
    ▼
GET /api/rfp/recent
    → Returns incomplete tasks with stage/progress info
    │
    ▼
User clicks a task in the Sessions panel
    │
    ▼
React state update: resumeTaskId = task.task_id
    → RfpProposalTask remounts with new key
    │
    ▼
useRfpTask.resumeTask(id)
    → GET /api/rfp/{id}
    → Finds latest completed stage
    → Sets currentStep to next wizard step
    │
    ▼
Wizard displays at correct step
    → User can continue from where they left off
```

Key points:
- **No page reload** — component swap via React state
- **Running stages reconnect** — if a stage is still running, console polling resumes

---

## Data Storage

### File Structure

Each task is stored in its own directory:

```
~/Desktop/cmbdir/rfp/
├── {task_id[:8]}/
│   ├── task.json                  # Complete task state + all stage data
│   └── input_files/
│       ├── task_config.json       # User configuration
│       ├── uploaded_rfp.pdf       # Original RFP document
│       ├── stage_1_output.md      # Requirements Analysis output
│       ├── stage_2_output.md      # Tools & Technology output
│       ├── stage_3_output.md      # Cloud & Infrastructure output
│       ├── stage_4_output.md      # Implementation Plan output
│       ├── stage_5_output.md      # Architecture Design output
│       ├── stage_6_output.md      # Execution Strategy output
│       ├── stage_7_output.md      # Proposal Compilation output
│       └── cost_summary.md        # Auto-generated on completion
```

### task.json Schema

| Field | Type | Description |
|---|---|---|
| `id` | string | Task UUID |
| `status` | string | `executing`, `completed`, `failed` |
| `task_description` | string | Human-readable description |
| `mode` | string | Always `"rfp"` |
| `model` | string | Default LLM model (Primary Agent) |
| `work_dir` | string | Absolute path to task directory |
| `task_config` | object | RFP configuration including per-agent model overrides (`model`, `specialist_model`, `review_model`) and uploaded file refs |
| `created_at` | string | ISO timestamp |
| `completed_at` | string | ISO timestamp or null |
| `stages` | array | Array of 7 stage objects |

### Stage Object

| Field | Type | Description |
|---|---|---|
| `stage_number` | int | 1–7 |
| `stage_name` | string | `requirements_analysis`, `tools_technology`, etc. |
| `status` | string | `pending`, `running`, `completed`, `failed` |
| `output_data` | object | `{"shared": {"<key>": "content"}, "cost": {...}}` |
| `error_message` | string | Error details if failed |
| `started_at` | string | ISO timestamp |
| `completed_at` | string | ISO timestamp |

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key for LLM pipeline stages |
| `ANTHROPIC_API_KEY` | No | — | Anthropic API key for Claude models |
| `RFP_DEFAULT_WORK_DIR` | No | `~/Desktop/cmbdir/rfp` | Root data directory |
| `LOG_LEVEL` | No | `INFO` | Logging level |

### Ports

| Service | Port |
|---|---|
| Backend (FastAPI) | 8000 |
| Frontend (Next.js) | 3000 |
