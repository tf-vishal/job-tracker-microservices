# 🚀 Job Application Tracker — Microservices

A microservices-based job application tracker built with Node.js, PostgreSQL, and React. Designed as a DevOps portfolio project.

## Architecture

```
React Frontend (port 3000)
        │
  API Gateway (port 8080)   ← JWT auth, rate limiting, request routing
        │
   ┌────┼────┬─────────────┐
Auth   Job  Resume  Notification
(3001)(3002)(3003)  (3004, cron)
  │     │     │         │
  DB    DB    DB        DB        ← each service owns its own Postgres database
```

## Services

| Service                | Port | Responsibility                                               |
| ---------------------- | ---- | ------------------------------------------------------------ |
| `api-gateway`          | 8080 | Single entry point — JWT validation, rate limiting, proxying |
| `auth-service`         | 3001 | Register, login, JWT access + refresh tokens                 |
| `job-service`          | 3002 | CRUD for job applications, stats, stale-job detection        |
| `resume-service`       | 3003 | Resume version metadata management                           |
| `notification-service` | 3004 | Cron scheduler for stale-job reminders                       |
| `frontend`             | 3000 | React SPA (Vite + Tailwind v4)                               |

## Quick Start

### Prerequisites

- Docker & Docker Compose v2
- Node.js 18+ (for local development only)

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env and set JWT_SECRET and JWT_REFRESH_SECRET to strong random strings
```

### 2. Run everything

```bash
docker compose up --build
```

- Frontend → http://localhost:3000
- API Gateway → http://localhost:8080
- Health checks → http://localhost:8080/health

<!-- ### 3. Run with monitoring (optional)
```bash
docker compose -f docker-compose.yml -f learning/monitoring/docker-compose.monitoring.yml up --build
```

- Prometheus → http://localhost:9090
- Grafana → http://localhost:3030 (admin / admin)

> ⚠️ Delete the stale `docker-compose.monitoring.yml` in the project root:
> ```bash
> rm docker-compose.monitoring.yml
> ``` -->

## Local Development (without Docker)

Each service can run standalone. Example for auth-service:

```bash
cd auth-service
npm install
cp .env.example .env   # configure DB connection to a local Postgres
npm run dev
```

## API Overview

All requests go through the API Gateway at `http://localhost:8080`.

| Method | Path                      | Description                                                 |
| ------ | ------------------------- | ----------------------------------------------------------- |
| POST   | `/auth/register`          | Create account                                              |
| POST   | `/auth/login`             | Login → returns access + refresh tokens                     |
| GET    | `/auth/me`                | Get current user (requires `Authorization: Bearer <token>`) |
| POST   | `/auth/refresh`           | Rotate refresh token                                        |
| GET    | `/jobs`                   | List job applications                                       |
| POST   | `/jobs`                   | Create job application                                      |
| PUT    | `/jobs/:id`               | Update job                                                  |
| DELETE | `/jobs/:id`               | Delete job                                                  |
| GET    | `/jobs/stats`             | Count by status                                             |
| GET    | `/resumes`                | List resume versions                                        |
| POST   | `/resumes`                | Add resume version                                          |
| PATCH  | `/resumes/:id/set-active` | Set active version                                          |
| GET    | `/notifications`          | List notifications (for current user)                       |
| PATCH  | `/notifications/read-all` | Mark all as read                                            |

## Health Checks

Every service exposes `GET /health` and `GET /metrics` (Prometheus).

```bash
curl http://localhost:8080/health
curl http://localhost:3001/health
```

## DevOps Learning Path

See [`learning/README.md`](./learning/README.md) for a step-by-step guide to:

1. Running on local Kubernetes (Minikube)
2. Helm chart deployment
3. Jenkins CI pipeline
4. ArgoCD GitOps CD
5. Prometheus + Grafana observability
6. Deploying to AWS EKS

## Project Structure

```
resume-project/
├── .env.example
├── docker-compose.yml
├── auth-service/
├── job-service/
├── resume-service/
├── notification-service/
├── api-gateway/
├── frontend/
└── learning/              ← DevOps configs (K8s, Helm, CI/CD, monitoring)
```

## Tech Stack

| Layer            | Technology                            |
| ---------------- | ------------------------------------- |
| Backend          | Node.js, Express                      |
| Frontend         | React 18, Vite, Tailwind CSS v4       |
| Database         | PostgreSQL 16                         |
| Auth             | JWT (access + refresh token rotation) |
| Containerization | Docker, Docker Compose                |
| K8s              | Kubernetes (Minikube local / AWS EKS) |
| CI               | Jenkins                               |
| CD               | ArgoCD (GitOps)                       |
| Monitoring       | Prometheus, Grafana                   |
