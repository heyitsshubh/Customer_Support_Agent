# Customer Support Agent System

A production-grade AI-powered customer support system with human-in-the-loop controls.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API Gateway | Fastify v5 + TypeScript |
| AI Microservice | Python + FastAPI + LangGraph |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| Observability | OpenTelemetry + LangSmith + Prometheus + Grafana |
| Logging | Pino (Node.js) + structlog (Python) |
| DI Container | Awilix |
| Auth | JWT (access + refresh token rotation) |

## Architecture

```
Client → Fastify API Gateway → Python AI Microservice (LangGraph)
              ↓                          ↓
         PostgreSQL + Redis         LLM + pgvector RAG
              ↓
     OTEL Collector → Prometheus → Grafana
     LangSmith (LLM traces)
     Jaeger (distributed traces)
```

## Features

- 🤖 AI agent resolves customer issues using RAG over company docs
- 🔒 Human-in-the-loop approval gate for financial actions (refunds)
- 📊 Full observability: traces, metrics, structured logs across both services
- 🏗️ Clean Architecture + SOLID principles + 12 design patterns
- 🎫 Full ticketing lifecycle with SLA tracking
- 📈 Analytics, CSAT, and experiment evaluation via LangSmith

## Quick Start

```bash
cp .env.example .env        # Fill in API keys
docker-compose up --build   # Start all services
```

Services:
- API Gateway: http://localhost:3000
- AI Agent: http://localhost:8001 (internal)
- Grafana: http://localhost:3001
- Jaeger: http://localhost:16686
- Prometheus: http://localhost:9090

## Branch Strategy

Each feature is developed on its own branch:

| Branch | Feature |
|--------|---------|
| `main` | Stable releases |
| `feat/project-scaffold` | Directory structure, configs, base setup |
| `feat/database-schema` | PostgreSQL schema, migrations |
| `feat/fastify-core` | Fastify server, plugins, DI, error handling |
| `feat/domain-layer` | Entities, value objects, domain events |
| `feat/infrastructure-layer` | Repositories, Redis, DB connection |
| `feat/auth-module` | JWT auth, user management |
| `feat/python-ai-service` | FastAPI + LangGraph scaffold |
| `feat/agent-nodes` | All 7 LangGraph agent nodes |
| `feat/agent-tools` | All 8 agent tools |
| `feat/rag-pipeline` | Embedding, retrieval, chunking |
| `feat/chat-module` | Chat routes + HITL approval |
| `feat/cases-module` | Cases, tickets, timeline |
| `feat/customers-orders-module` | Customer + order routes |
| `feat/refunds-module` | Refund lifecycle |
| `feat/docs-module` | Knowledge base management |
| `feat/analytics-feedback-module` | Analytics + CSAT |
| `feat/admin-module` | Admin: users, system |
| `feat/observability` | OTEL, metrics, structured logging |
| `feat/docker-compose` | Full deployment stack |
| `feat/tests` | Unit + integration + eval tests |

## API Docs

After starting: http://localhost:3000/documentation (Swagger UI)

## License

MIT
