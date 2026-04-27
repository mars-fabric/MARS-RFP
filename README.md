# MARS RFP Proposal Generator

Standalone RFP Proposal Generator — extracted from [MARS](https://github.com/UJ2202/MARS.git).

Generates comprehensive technical proposals from RFP documents through a **7-stage, multi-agent pipeline**:
1. **Requirements Analysis** — Parses and structures RFP requirements
2. **Tools & Technology** — Recommends technology stack with cost analysis
3. **Cloud & Infrastructure** — Designs hosting/cloud architecture (respects RFP-mandated platforms)
4. **Implementation Plan** — Creates development roadmap
5. **Architecture Design** — Produces system architecture
6. **Execution Strategy** — Defines delivery approach
7. **Proposal Compilation** — Assembles final proposal document

Each stage uses a **3-agent pipeline** (Primary → Specialist → Reviewer) with independently configurable models per agent role.

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+

### Development

```bash
# Install backend
python -m venv .venv && source .venv/bin/activate
pip install -r Requirements.txt

# Start backend (port 8000)
cd backend && python run.py

# In another terminal — install and start frontend (port 3000)
cd mars-ui && npm install && npm run dev
```

### Docker

```bash
cp .env.example .env  # fill in API keys
docker compose up
```

Open http://localhost:3000

## Multi-Agent System

Each of the 7 stages uses a team of **3 specialized agents** that collaborate sequentially:

| Agent Role | Purpose |
|---|---|
| **Primary Agent** | Domain expert that generates initial content |
| **Specialist Agent** | Validates, enriches, and adds domain-specific depth |
| **Reviewer Agent** | Quality reviewer with 13-point checklist |

Users can select a **different model for each agent role** in the Advanced Settings panel (Primary Agent Model, Specialist Agent Model, Reviewer Agent Model). If not selected, all agents default to the configured `WorkflowConfig.default_llm_model`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key for LLM pipeline stages |
| `ANTHROPIC_API_KEY` | No | Anthropic API key for Claude models |
| `GOOGLE_API_KEY` | No | Google API key for Gemini models |

## Architecture

See the [docs/](docs/) folder for detailed documentation:
- [rfp-integration.md](docs/rfp-integration.md) — End-to-end integration docs
- [rfp-proposal-generator.md](docs/rfp-proposal-generator.md) — Complete feature guide
- [rfp-flow-diagram.md](docs/rfp-flow-diagram.md) — Flow diagrams
- [SESSION_MANAGEMENT.md](docs/SESSION_MANAGEMENT.md) — Session & task lifecycle
- [logging.md](docs/logging.md) — Logging patterns
- [cmbagent-patches.md](docs/cmbagent-patches.md) — Patches to `mars-cmbagent` library
