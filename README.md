<div align="center">

# 🤖 Customer Support Agent

### Production-grade AI-powered customer support system with human-in-the-loop controls

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Fastify](https://img.shields.io/badge/Fastify-v5-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-1C3C3C?logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+pgvector-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-enabled-F5A800?logo=opentelemetry&logoColor=white)](https://opentelemetry.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[**Live API Docs →**](http://localhost:3000/api/docs) · [**Redoc Reference →**](http://localhost:3000/api/redoc) · [**Grafana Dashboard →**](http://localhost:3001)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Key Features](#-key-features)
- [Project Structure](#-project-structure)
- [Agent Workflow](#-agent-workflow)
- [API Reference](#-api-reference)
- [Quick Start](#-quick-start)
- [Development Setup](#-development-setup)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [Running Tests](#-running-tests)
- [Observability](#-observability)
- [Branch Strategy](#-branch-strategy)
- [Contributing](#-contributing)

---

## 🌟 Overview

**Customer Support Agent** is a full-stack, production-grade system that combines a **Fastify API Gateway** (TypeScript) with a **LangGraph multi-agent AI microservice** (Python) to automatically resolve customer support requests — from billing disputes and duplicate charges to order tracking and refund processing.

The system implements **Clean Architecture** principles with a hard boundary between domain logic and infrastructure. It features a **human-in-the-loop (HITL) approval gate** that pauses the AI workflow whenever a financial action (e.g., issuing a refund) requires supervisor authorisation before execution.

### What it does

1. A customer sends a message via the chat API
2. The LangGraph agent **classifies the intent**, **retrieves relevant policy docs** via pgvector RAG, and **fetches customer data**
3. The agent **reasons and plans** an action — if it's a financial action, the graph **interrupts** and waits for human approval
4. A supervisor approves (or rejects) via `POST /chat/:threadId/approve`
5. The agent **resumes**, executes the action (e.g., initiating a refund), and **composes a response**
6. Every step is traced in **Jaeger**, metrics exported to **Prometheus/Grafana**, and LLM calls traced in **LangSmith**

---

## 🏗 System Architecture

```
                         ┌─────────────────────────────────────────────┐
                         │            CLIENT / BROWSER                 │
                         └──────────────────┬──────────────────────────┘
                                            │ HTTPS
                         ┌──────────────────▼──────────────────────────┐
                         │      Fastify API Gateway  :3000             │
                         │         (TypeScript · Node.js 22)           │
                         │                                             │
                         │  Auth · Rate Limit · RBAC · Circuit Breaker │
                         │  Awilix DI · OpenAPI 3.1 · Swagger UI      │
                         └──────┬──────────────────────┬───────────────┘
                                │ postgres.js           │ HTTP + X-Internal-Token
                   ┌────────────▼──────────┐   ┌───────▼────────────────────────┐
                   │  PostgreSQL 16        │   │  Python AI Microservice :8001  │
                   │  + pgvector           │   │  (FastAPI · LangGraph 0.2)     │
                   │                       │   │                                │
                   │  10 tables            │   │  7-node StateGraph             │
                   │  HNSW vector index    │   │  8 tools (5 read · 3 write)   │
                   │  (m=16, ef=64)        │   │  pgvector RAG retriever        │
                   └────────────┬──────────┘   │  interrupt() approval gate     │
                                │              └──────────┬─────────────────────┘
                   ┌────────────▼──────────┐              │ OpenAI API
                   │  Redis 7              │   ┌──────────▼─────────────────────┐
                   │                       │   │  OpenAI                        │
                   │  Token blacklist       │   │  text-embedding-3-small (RAG) │
                   │  Rate limiting         │   │  gpt-4o-mini (reasoning)      │
                   │  Session cache         │   └────────────────────────────────┘
                   └────────────┬──────────┘
                                │
                   ┌────────────▼──────────────────────────────────────┐
                   │          Observability Stack                       │
                   │                                                    │
                   │  OTEL Collector → Jaeger  (distributed traces)    │
                   │  OTEL Collector → Prometheus → Grafana (metrics)  │
                   │  LangSmith  (LLM call traces + evals)             │
                   │  Pino (Node.js) · structlog (Python)              │
                   └────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **API Gateway** | Fastify v5 + TypeScript 5.6 | REST API, auth, routing |
| **AI Microservice** | Python 3.12 + FastAPI 0.115 | LangGraph agent host |
| **AI Workflow** | LangGraph 0.2 | Multi-step stateful agent |
| **LLM** | GPT-4o-mini | Intent classification, reasoning, response |
| **Embeddings** | text-embedding-3-small | RAG document embedding |
| **Database** | PostgreSQL 16 + pgvector | Structured data + vector search |
| **Cache** | Redis 7 | Token blacklist, rate limiting, session cache |
| **DI Container** | Awilix | Dependency injection (TypeScript) |
| **Auth** | JWT (access + refresh rotation) + scrypt | Stateless auth with Redis blacklist |
| **Circuit Breaker** | Opossum | AI agent HTTP resilience |
| **Validation** | Zod (TS) + Pydantic v2 (Python) | Strict input validation |
| **Observability** | OpenTelemetry + Jaeger + Prometheus + Grafana | Full-stack telemetry |
| **LLM Tracing** | LangSmith | LLM observability + eval |
| **Logging** | Pino (Node) + structlog (Python) | Structured JSON logs |
| **API Docs** | @fastify/swagger + Redoc | OpenAPI 3.1 interactive docs |
| **Testing** | Jest + ts-jest (TS) · Pytest (Python) | Unit test suites |
| **Deployment** | Docker + Docker Compose | One-command spin-up |

---

## ✨ Key Features

### 🤖 Intelligent AI Agent (LangGraph)
- **7-node StateGraph** — classify → retrieve → fetch_data → reason → approval_gate → execute → respond
- **Intent classification** across billing disputes, order status, refund requests, general inquiries
- **RAG knowledge base** — pgvector HNSW cosine similarity search over policy documents
- **Duplicate charge detection** — `isDuplicateOf()` logic with configurable time window (5 min)
- **State persistence** — LangGraph thread state survives server restarts for async approval

### 🔒 Human-in-the-Loop Approval Gate
- The `approval_gate_node` calls `interrupt()` — graph execution **suspends** at the refund step
- A reviewer/admin hits `POST /api/v1/chat/:threadId/approve` with `{approved: true, notes: "..."}`
- Graph **resumes** via `Command(resume={...})` and executes (or rejects) the financial action
- Full audit trail: who approved, when, notes — stored on the refund request

### 🔐 Authentication & RBAC
- **Access tokens** (15 min) + **refresh tokens** (7 days) with rotation
- **Redis token blacklist** — logout immediately invalidates tokens
- **4 roles** — `customer`, `agent`, `reviewer`, `admin` with granular route protection
- **scrypt** password hashing (no bcrypt — native crypto module)

### 📊 Full Observability
- **Distributed tracing** — every HTTP request traced end-to-end (Fastify → Python → DB → LLM)
- **Prometheus metrics** — LLM token counts, agent run durations, tool call totals, RAG latency
- **Grafana dashboard** — pre-provisioned agent performance dashboard
- **LangSmith** — LLM call traces, prompt inspection, evaluation runs
- **Structured logs** — JSON logs with request IDs, correlation IDs, latencies

### 🏗 Clean Architecture
- **Domain layer** — value objects (`Money`, `CaseStatus`, `RefundStatus`), aggregate roots (`SupportCase`, `RefundRequest`), domain events
- **Application layer** — use cases (`StartChatUseCase`, `ApproveCaseUseCase`, `SendMessageUseCase`)
- **Infrastructure layer** — repository implementations (Postgres), cache, HTTP client
- **Interface layer** — Fastify route handlers, schemas, plugins

---

## 📁 Project Structure

```
customer-support-system/
├── services/
│   ├── api/                           # Fastify API Gateway (TypeScript)
│   │   ├── src/
│   │   │   ├── config.ts              # Zod env validation
│   │   │   ├── server.ts              # Fastify factory + plugin registration
│   │   │   ├── container.ts           # Awilix DI container
│   │   │   ├── domain/
│   │   │   │   ├── value-objects/     # Money · Email · CaseStatus · RefundStatus
│   │   │   │   ├── entities/          # Customer · Order · Transaction · SupportCase · RefundRequest
│   │   │   │   ├── events/            # CaseCreatedEvent · RefundApprovedEvent · …
│   │   │   │   ├── errors/            # DomainErrors hierarchy
│   │   │   │   └── interfaces/        # ICaseRepository · ICustomerRepository · …
│   │   │   ├── application/
│   │   │   │   └── use-cases/chat/    # StartChatUseCase · SendMessageUseCase · ApproveCaseUseCase
│   │   │   ├── infrastructure/
│   │   │   │   ├── database/          # postgres.js pool · migrations · Pg repositories
│   │   │   │   ├── cache/             # RedisCacheService
│   │   │   │   ├── http/              # AIAgentClient (opossum circuit breaker)
│   │   │   │   ├── security/          # JwtUtil · PasswordUtil
│   │   │   │   └── observability/     # logger · metrics · tracer
│   │   │   └── interface/
│   │   │       ├── plugins/           # auth.plugin.ts · swagger.plugin.ts
│   │   │       ├── errors/            # GlobalErrorHandler
│   │   │       ├── openapi/           # constants.ts (shared tags · security · responses)
│   │   │       └── modules/
│   │   │           ├── health/        # GET /health · /health/ready · /metrics
│   │   │           ├── auth/          # POST /auth/register · /login · /refresh · /logout
│   │   │           ├── chat/          # POST /chat · /chat/:id/message · /chat/:id/approve
│   │   │           ├── cases/         # GET/PATCH /cases · timeline · notes · assign
│   │   │           ├── customers/     # GET /customers/:id · orders · transactions
│   │   │           ├── orders/        # GET /orders/:id · tracking · cancel
│   │   │           ├── refunds/       # GET/POST/PATCH /refunds
│   │   │           ├── docs/          # POST/GET/PATCH/DELETE /docs · vector search
│   │   │           ├── feedback/      # POST /feedback · CSAT summary
│   │   │           ├── analytics/     # GET /analytics/overview · topics · reports
│   │   │           ├── admin/         # GET/PATCH/DELETE /admin/users
│   │   │           └── experiments/   # POST /experiments/run
│   │   ├── tests/
│   │   │   └── unit/
│   │   │       ├── domain/            # Money · CaseStatus · RefundStatus · Transaction · SupportCase · RefundRequest
│   │   │       └── application/       # StartChatUseCase · ApproveCaseUseCase
│   │   ├── scripts/
│   │   │   ├── migrate.ts             # Auto migration runner
│   │   │   ├── seed.ts                # Dev seed data (incl. ORD-1042 duplicate charge)
│   │   │   └── generate-openapi.ts    # Build-time OpenAPI spec export
│   │   ├── public/
│   │   │   └── redoc.html             # Redoc documentation portal
│   │   ├── docs/
│   │   │   └── SWAGGER_GUIDE.md       # API docs usage guide
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── jest.config.js
│   │   └── Dockerfile
│   │
│   └── ai-agent/                      # Python AI Microservice (FastAPI + LangGraph)
│       ├── src/
│       │   ├── config.py              # Pydantic Settings
│       │   ├── api/
│       │   │   ├── main.py            # FastAPI app factory + lifespan
│       │   │   ├── middleware/auth.py  # InternalAuthMiddleware (X-Internal-Token)
│       │   │   └── routers/
│       │   │       ├── health.py      # Liveness + readiness
│       │   │       └── agent.py       # POST /run · POST /resume · GET /state/:id
│       │   ├── agent/
│       │   │   ├── state.py           # AgentState TypedDict
│       │   │   ├── graph.py           # build_support_graph() · run/resume_support_agent()
│       │   │   ├── router.py          # Conditional edge functions
│       │   │   └── nodes/
│       │   │       ├── classify_node.py    # Intent classification (LLM)
│       │   │       ├── rag_node.py         # pgvector document retrieval
│       │   │       ├── fetch_data_node.py  # Customer/order/transaction data
│       │   │       ├── reason_node.py      # Reasoning + action planning (LLM)
│       │   │       ├── approval_node.py    # interrupt() HITL gate
│       │   │       ├── execute_node.py     # Tool execution
│       │   │       └── respond_node.py     # Final response composition (LLM)
│       │   ├── tools/
│       │   │   ├── read_tools.py      # get_customer_profile · get_order_status · get_transactions
│       │   │   │                      # check_refund_eligibility · search_policy_docs
│       │   │   ├── write_tools.py     # request_refund · escalate_to_human · send_resolution_email
│       │   │   └── registry.py        # ALL_TOOLS · READ_TOOLS · WRITE_TOOLS
│       │   ├── rag/
│       │   │   ├── embedder.py        # VectorEmbedder (OpenAI + deterministic fallback)
│       │   │   └── retriever.py       # DocumentRetriever (pgvector cosine similarity)
│       │   ├── infrastructure/
│       │   │   ├── database.py        # SQLAlchemy 2 async engine + sessions
│       │   │   └── cache.py           # Redis async client
│       │   └── observability/
│       │       ├── logging.py         # structlog configuration
│       │       ├── metrics.py         # Prometheus MetricsRegistry
│       │       └── tracing.py         # OTEL TracerProvider
│       ├── tests/
│       │   └── unit/
│       │       ├── test_classify_node.py   # Intent classification tests
│       │       ├── test_reason_node.py     # Pending action creation tests
│       │       ├── test_approval_node.py   # interrupt() gate tests
│       │       └── test_read_tools.py      # Mock DB tool tests
│       ├── tests/eval/
│       │   ├── golden_dataset.json    # 6 golden test scenarios
│       │   └── eval_runner.py         # Async benchmark runner
│       ├── pyproject.toml
│       ├── pytest.ini
│       └── Dockerfile
│
└── infrastructure/
    ├── postgres/
    │   └── init.sql                   # DDL: 10 tables · pgvector · HNSW index
    ├── docker-compose.yml             # 8 services: api · ai-agent · postgres · redis
    │                                  #             otel-collector · prometheus · grafana · jaeger
    ├── otel/
    │   └── otel-collector-config.yaml
    ├── prometheus/
    │   └── prometheus.yml
    └── grafana/
        ├── provisioning/datasources/  # Auto-provisioned Prometheus datasource
        └── dashboards/                # Agent performance dashboard JSON
```

---

## 🔄 Agent Workflow

```
User Message
     │
     ▼
┌─────────────────────┐
│  classify_intent    │  LLM classifies: billing_dispute | order_status |
│                     │  refund_request | general_inquiry | escalation
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  retrieve_context   │  pgvector HNSW cosine search → top-K policy docs
│                     │  (text-embedding-3-small, 1536-dim vectors)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  fetch_customer_    │  get_customer_profile · get_order_status
│  data               │  get_transactions · check_refund_eligibility
│                     │  isDuplicateOf() duplicate charge detection
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  reason_and_plan    │  LLM builds action plan with reasoning chain
│                     │  Sets pending_action + requires_approval flag
└──────────┬──────────┘
           │
     ┌─────▼─────┐
     │ approval  │  requires_approval=True?
     │ required? │
     └──┬────┬───┘
   YES  │    │  NO
        │    └──────────────────────┐
        ▼                           │
┌───────────────────┐               │
│  approval_gate    │               │
│  interrupt() ⏸   │               │
│  ← GRAPH PAUSES   │               │
│                   │               │
│  Supervisor hits  │               │
│  POST /approve    │               │
│  → graph resumes  │               │
└──────────┬────────┘               │
           │                        │
           ▼                        ▼
┌─────────────────────────────────────┐
│  execute_action                     │
│  request_refund · escalate_to_human │
│  send_resolution_email              │
│  (write tools check supervisor_approved) │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────┐
│  compose_response   │  LLM writes customer-facing message
│                     │  with empathy + resolution details
└─────────────────────┘
```

---

## 📡 API Reference

Full interactive documentation is available at runtime:

| Interface | URL | Description |
|-----------|-----|-------------|
| **Swagger UI** | `http://localhost:3000/api/docs` | Interactive try-it-out explorer |
| **Redoc** | `http://localhost:3000/api/redoc` | Beautiful three-panel reference |
| **OpenAPI JSON** | `http://localhost:3000/api/docs/json` | Machine-readable spec |
| **OpenAPI YAML** | `http://localhost:3000/api/docs/yaml` | Human-readable spec |

### Endpoint Summary

<details>
<summary><strong>🔐 Auth</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/register` | — | Create a new user account |
| `POST` | `/api/v1/auth/login` | — | Login → returns `{accessToken, refreshToken}` |
| `POST` | `/api/v1/auth/refresh` | — | Exchange refresh token for new token pair |
| `POST` | `/api/v1/auth/logout` | Bearer | Invalidate tokens (Redis blacklist) |
| `GET`  | `/api/v1/users/me` | Bearer | Get current user profile |

</details>

<details>
<summary><strong>💬 Chat (AI Agent)</strong></summary>

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/chat` | customer+ | Start new AI chat session |
| `POST` | `/api/v1/chat/:threadId/message` | customer+ | Send follow-up message |
| `POST` | `/api/v1/chat/:threadId/approve` | reviewer, admin | Approve or reject pending action |
| `GET`  | `/api/v1/chat/:threadId` | customer+ | Get chat thread + message history |

</details>

<details>
<summary><strong>📋 Cases</strong></summary>

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/cases` | agent+ | List cases (paginated, filterable) |
| `GET` | `/api/v1/cases/pending-approval` | reviewer+ | Cases awaiting HITL approval |
| `GET` | `/api/v1/cases/:id` | agent+ | Case detail |
| `GET` | `/api/v1/cases/:id/timeline` | agent+ | Full event timeline |
| `POST` | `/api/v1/cases/:id/assign` | agent+ | Assign to agent |
| `PATCH` | `/api/v1/cases/:id/priority` | agent+ | Change priority |
| `PATCH` | `/api/v1/cases/:id/close` | agent+ | Close case |
| `POST` | `/api/v1/cases/:id/notes` | agent+ | Add internal note |

</details>

<details>
<summary><strong>👤 Customers · 📦 Orders · 💸 Refunds</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/customers/:id` | Customer profile |
| `GET` | `/api/v1/customers/:id/orders` | Order history |
| `GET` | `/api/v1/customers/:id/transactions` | Transaction history |
| `GET` | `/api/v1/orders/:id` | Order detail |
| `GET` | `/api/v1/orders/:id/tracking` | Shipping tracking |
| `POST` | `/api/v1/orders/:id/cancel` | Request cancellation |
| `GET` | `/api/v1/refunds` | List refunds |
| `POST` | `/api/v1/refunds` | Create refund request |
| `GET` | `/api/v1/refunds/:id` | Refund detail |
| `PATCH` | `/api/v1/refunds/:id/status` | Update status |

</details>

<details>
<summary><strong>📚 Knowledge Base · 📊 Analytics · ⚙️ Admin</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/docs` | Create + embed document |
| `POST` | `/api/v1/docs/search` | Vector similarity search |
| `POST` | `/api/v1/feedback` | Submit CSAT feedback |
| `GET` | `/api/v1/analytics/overview` | KPI summary (volume, CSAT, resolution time) |
| `GET` | `/api/v1/analytics/topics` | Case topic breakdown |
| `GET` | `/api/v1/analytics/agent-performance` | Per-agent metrics |
| `GET` | `/api/v1/reports/daily` | Daily report (JSON / CSV) |
| `GET` | `/api/v1/admin/users` | List all users (admin) |
| `PATCH` | `/api/v1/admin/users/:id/role` | Assign role (admin) |
| `POST` | `/api/v1/experiments/run` | Run LLM eval against golden dataset |

</details>

---

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- An **OpenAI API key** (`OPENAI_API_KEY`)

### 1 · Clone & configure

```bash
git clone https://github.com/heyitsshubh/Customer_Support_Agent.git
cd Customer_Support_Agent

# Merge all feature branches (or checkout main after PRs are merged)
cp .env.example .env
```

Edit `.env` and set at minimum:
```env
OPENAI_API_KEY=sk-...
JWT_ACCESS_SECRET=change-me-to-a-random-64-char-string
JWT_REFRESH_SECRET=change-me-to-another-64-char-string
INTERNAL_SERVICE_TOKEN=some-strong-secret
```

### 2 · Start all services

```bash
docker-compose -f infrastructure/docker-compose.yml up --build
```

This spins up **8 containers**:

| Service | Port | Description |
|---------|------|-------------|
| `api` | `3000` | Fastify API Gateway |
| `ai-agent` | `8001` | Python LangGraph service (internal) |
| `postgres` | `5432` | PostgreSQL 16 + pgvector |
| `redis` | `6379` | Redis 7 |
| `otel-collector` | `4317/4318` | OpenTelemetry Collector |
| `prometheus` | `9090` | Metrics scraper |
| `grafana` | `3001` | Dashboard UI |
| `jaeger` | `16686` | Distributed trace UI |

### 3 · Seed the database

```bash
docker-compose exec api npm run migrate
docker-compose exec api npm run seed
```

The seeder creates:
- 5 customers (standard, premium, enterprise tiers)
- 10 orders with realistic statuses
- **ORD-1042** — a real duplicate charge scenario (two `$89.99` charges 2 min apart)
- 15 knowledge base documents with pre-computed embeddings

### 4 · Try it out

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"secret123","role":"customer"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}' | jq -r .accessToken)

# Start a chat with the AI agent
curl -X POST http://localhost:3000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"customer-001","message":"I was charged twice for order ORD-1042!"}'
```

Open **Swagger UI** at [http://localhost:3000/api/docs](http://localhost:3000/api/docs) to explore all endpoints interactively.

---

## 🔧 Development Setup

### Node.js API (without Docker)

```bash
cd services/api
npm install
cp ../../.env.example .env    # configure local .env
npm run dev                    # tsx watch — hot reload
```

### Python AI Service (without Docker)

```bash
cd services/ai-agent
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/macOS
pip install poetry
poetry install
uvicorn src.api.main:app --reload --port 8001
```

### Generate OpenAPI spec

```bash
cd services/api
npm run generate:openapi
# → writes services/api/openapi.json
# Import into Postman / Insomnia
```

---

## 🌍 Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# ── OpenAI ───────────────────────────────────────────────────
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini

# ── Database ─────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/support_agent

# ── Redis ────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Auth ─────────────────────────────────────────────────────
JWT_ACCESS_SECRET=<64-char random string>
JWT_REFRESH_SECRET=<64-char random string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── Internal Service ─────────────────────────────────────────
INTERNAL_SERVICE_TOKEN=<strong random secret>
PYTHON_AI_AGENT_URL=http://localhost:8001

# ── LangSmith (optional) ─────────────────────────────────────
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=ls__...
LANGCHAIN_PROJECT=customer-support-agent

# ── OpenTelemetry ────────────────────────────────────────────
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME_API=api-gateway
OTEL_SERVICE_NAME_AI=ai-agent

# ── Server ───────────────────────────────────────────────────
PORT=3000
NODE_ENV=development
PYTHON_PORT=8001
LOG_LEVEL=info
```

---

## 🗃 Database Schema

10 PostgreSQL tables with full relational integrity:

```
users ──────────────────────── customers
                                    │
                        ┌───────────┤
                        │           │
                      orders    support_cases ── refund_requests
                        │           │
                   transactions  (outbox for domain events)
                        
documents (pgvector HNSW, 1536-dim embeddings)
feedback
```

**Key design decisions:**
- **pgvector HNSW index** — `m=16, ef_construction=64` on `documents.embedding` for fast ANN search
- **Outbox pattern** — `outbox` table for reliable domain event publishing
- **All monetary values** stored as `NUMERIC(12,2)` with explicit currency column
- **UUID primary keys** — `gen_random_uuid()` on all tables

---

## 🧪 Running Tests

### TypeScript Unit Tests (Jest)

```bash
cd services/api

# Run all unit tests
npm run test:unit

# Run with coverage report (target: 80% lines/functions)
npm run test:coverage
```

Tests cover:
- **Value objects** — `Money`, `CaseStatus`, `RefundStatus` state machines
- **Entities** — `Transaction.isDuplicateOf()`, `SupportCase` domain events, `RefundRequest` lifecycle
- **Use cases** — `StartChatUseCase`, `ApproveCaseUseCase` with mocked repositories

### Python Unit Tests (Pytest)

```bash
cd services/ai-agent
pytest tests/unit/ -v

# Or with asyncio support
python -m pytest tests/unit/ -v --tb=short
```

Tests cover:
- `classify_intent_node` — intent routing with mocked LLM
- `reason_and_plan_node` — `pending_action` creation for duplicate charges
- `approval_gate_node` — `interrupt()` suspension and passthrough behaviour
- `read_tools` — mock DB calls, duplicate detection, RAG retrieval

### LLM Evaluation (Golden Dataset)

```bash
cd services/ai-agent
python tests/eval/eval_runner.py
# Runs 6 golden scenarios and reports pass/fail + metrics
```

---

## 📈 Observability

| Tool | URL | What to look for |
|------|-----|-----------------|
| **Swagger UI** | [localhost:3000/api/docs](http://localhost:3000/api/docs) | Explore and call all endpoints |
| **Redoc** | [localhost:3000/api/redoc](http://localhost:3000/api/redoc) | Full API reference |
| **Grafana** | [localhost:3001](http://localhost:3001) | Agent run durations, tool call rates, LLM token usage |
| **Jaeger** | [localhost:16686](http://localhost:16686) | Distributed traces across Fastify → Python → DB |
| **Prometheus** | [localhost:9090](http://localhost:9090) | Raw metrics scrape |
| **LangSmith** | [smith.langchain.com](https://smith.langchain.com) | LLM call traces, token costs, eval results |

### Key Prometheus Metrics

```
# LangGraph agent
agent_run_duration_seconds{status="completed|failed"}
agent_tool_calls_total{tool_name="...", status="..."}

# RAG pipeline
rag_retrieval_duration_seconds
rag_documents_retrieved_total

# LLM usage
llm_tokens_used_total{model="gpt-4o-mini", token_type="input|output"}

# Fastify (via @opentelemetry/instrumentation-fastify)
http_request_duration_seconds{method, route, status_code}
```

---

## 🌿 Branch Strategy

Each feature was built and pushed independently — one small feature per branch:

| Branch | What was built |
|--------|---------------|
| `main` | README, .gitignore, .env.example |
| `feat/project-scaffold` | Fastify scaffold, DI container, infra (logger, OTEL, metrics, DB, Redis, circuit breaker) |
| `feat/db-tables` | PostgreSQL DDL — 10 tables, pgvector extension, HNSW index |
| `feat/db-seed-script` | Migration runner + seeder with ORD-1042 duplicate charge scenario |
| `feat/domain-entities` | Value objects, aggregate roots, domain events, repository interfaces |
| `feat/infrastructure-repositories` | All 5 Postgres repository implementations |
| `feat/auth-jwt` | JWT + scrypt auth, Redis blacklist, RBAC decorator |
| `feat/agent-tools-and-rag` | 8 LangGraph tools (5 read, 3 write) + pgvector RAG retriever |
| `feat/langgraph-workflow` | Full 7-node StateGraph with `interrupt()` approval gate |
| `feat/chat-approval-api` | Chat use cases + `/chat` routes with HITL approval |
| `feat/cases-and-tickets-api` | Cases CRUD, timeline, notes, assignment, priority |
| `feat/customers-orders-refunds-api` | Customer profile, order detail, refund lifecycle |
| `feat/docs-knowledge-base-api` | Knowledge base CRUD + vector similarity search endpoint |
| `feat/analytics-feedback-api` | CSAT feedback, KPI analytics, daily CSV/JSON reports |
| `feat/admin-eval-experiments-api` | Admin RBAC, user management, LLM golden-dataset evaluation |
| `feat/observability-docker-deployment` | Docker Compose, OTEL Collector, Prometheus, Grafana, Jaeger |
| `feat/unit-integration-tests` | Jest unit tests (TS domain + use cases), Pytest tests (LangGraph nodes + tools) |
| `feat/swagger-api-docs` | OpenAPI 3.1, Swagger UI, Redoc portal, `generate:openapi` script |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes with tests
4. Ensure all tests pass: `npm run test:unit` + `pytest tests/unit/`
5. Push your branch: `git push origin feat/your-feature`
6. Open a Pull Request against `main`

### Code Style
- **TypeScript** — ESLint + Prettier (run `npm run lint:fix`)
- **Python** — Ruff + Black (run `ruff check . --fix && black .`)
- All new features must include unit tests
- Domain logic must have no infrastructure imports

---

## 📄 License

MIT © 2024 — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ using **LangGraph**, **Fastify**, **PostgreSQL + pgvector**, and **OpenTelemetry**

⭐ Star this repo if you found it helpful!

[GitHub](https://github.com/heyitsshubh/Customer_Support_Agent) · [API Docs](http://localhost:3000/api/docs) · [Issues](https://github.com/heyitsshubh/Customer_Support_Agent/issues)

</div>
