# API Documentation Guide

This document explains the three ways to explore the Customer Support Agent API.

## 1. Swagger UI — Interactive Explorer

**URL:** `http://localhost:3000/api/docs`

The built-in Swagger UI lets you:
- Browse all endpoints organised by tag
- Try requests live from the browser (click **Try it out**)
- Authenticate with a Bearer token (click 🔓 **Authorize**)
- Download the raw OpenAPI spec (JSON/YAML)

### How to authenticate in Swagger UI
1. Call `POST /api/v1/auth/login` with your credentials
2. Copy the `accessToken` from the response
3. Click **Authorize** (🔓 top-right)
4. Paste `<your-token>` into the **BearerAuth** field
5. Click **Authorize** → all subsequent requests will include the header

---

## 2. Redoc Portal — Beautiful Reference

**URL:** `http://localhost:3000/api/redoc`

Redoc renders a three-panel reference document with:
- Sidebar navigation by tag
- Collapsible request/response schemas
- Code samples
- Full schema component references

---

## 3. Raw OpenAPI Spec

| Format | URL |
|--------|-----|
| JSON   | `http://localhost:3000/api/docs/json` |
| YAML   | `http://localhost:3000/api/docs/yaml` |

### Generate `openapi.json` at build time

```bash
cd services/api
npm run generate:openapi
# → writes openapi.json to services/api/
```

Import this file into **Postman**, **Insomnia**, or **Stoplight**.

---

## API Endpoints at a Glance

| Tag | Prefix | Purpose |
|-----|--------|---------|
| Health | `/health` | Liveness, readiness, Prometheus `/metrics` |
| Auth | `/api/v1/auth` | Register, login, refresh, logout |
| Chat | `/api/v1/chat` | AI chat sessions, human-in-the-loop approval |
| Cases | `/api/v1/cases` | Support case management |
| Customers | `/api/v1/customers` | Customer profile & history |
| Orders | `/api/v1/orders` | Order detail & tracking |
| Refunds | `/api/v1/refunds` | Refund request lifecycle |
| Documents | `/api/v1/docs` | Knowledge base + vector search |
| Feedback | `/api/v1/feedback` | CSAT submissions |
| Analytics | `/api/v1/analytics` | KPI dashboards, reports |
| Admin | `/api/v1/admin` | User & role management |
| Experiments | `/api/v1/experiments` | LLM eval runs |

## Authentication

All protected endpoints require:

```
Authorization: Bearer <access_token>
```

Access tokens expire in **15 minutes**. Use `POST /api/v1/auth/refresh` with the `refreshToken` to obtain a new pair.

## Role-Based Access Control

| Role | Permissions |
|------|-------------|
| `customer` | Own data only, create chat sessions |
| `agent` | All cases, assign, add notes |
| `reviewer` | Approve/reject pending refund approvals |
| `admin` | Everything including user management |

## Rate Limits

- **Global:** 100 req/min per IP
- **Auth endpoints:** 10 req/min per IP
- **429 Too Many Requests** is returned when exceeded
