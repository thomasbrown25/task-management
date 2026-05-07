# Task Management

A full-stack task management application built with **.NET 9**, **EF Core + SQLite**, and **React + Vite + TypeScript**.

This project implements a practical task workflow with API and frontend components: task CRUD, completion tracking, priorities, due dates, tags, search, filtering, sorting, local persistence, and automated tests. The implementation favors clear structure and straightforward setup while keeping the scope focused on the requested task-management requirements.

## Features

- Create, edit, delete, complete, and reopen tasks
- Server-side search across title, description, and tags
- Server-side filters for all, active, completed, overdue, and priority
- Server-side sorting by created date, updated date, due date, priority, or title
- Date-only due-date contract using `YYYY-MM-DD`
- Priority levels: low, medium, high
- Tags for lightweight task grouping
- Summary metrics: total, active, completed, overdue, due today
- Loading, empty, success, and error states in the UI
- Failed create/update keeps the user's draft in place
- Failed completion/delete mutations surface errors and avoid silent data loss

## Tech stack

- Backend: .NET 9 minimal APIs
- Data: EF Core with SQLite
- Frontend: React, Vite, TypeScript
- Backend tests: xUnit, WebApplicationFactory, SQLite test databases
- Frontend tests: Vitest, React Testing Library, jsdom

## Repository structure

```text
task-management/
  TaskManagement.sln
  docker-compose.yml
  src/
    TaskManagement.Api/
      Data/
      Tasks/
      Common/       # reserved for shared API concerns as the app grows
    TaskManagement.Web/
      src/
        lib/
        test/
  tests/
    TaskManagement.Api.Tests/
```

The backend uses feature folders rather than a controller/service/repository stack. EF Core already provides unit-of-work and query composition, so a repository abstraction would add indirection without improving this small app. The result is intentionally simple: task endpoints, task DTOs, validation, mapping, and persistence are easy to review together.

## Prerequisites

- .NET SDK 9
- Node.js 22+
- npm 10+

Optional:

- Docker Desktop or compatible Docker runtime

## Local setup

From the repository root:

```bash
dotnet restore
cd src/TaskManagement.Web
npm install
```

## Run locally

Terminal 1 — API:

```bash
dotnet run --project src/TaskManagement.Api/TaskManagement.Api.csproj
```

The API listens on:

```text
http://localhost:5085
```

Terminal 2 — frontend:

```bash
cd src/TaskManagement.Web
npm run dev
```

The frontend listens on:

```text
http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:5085`. You can also copy `src/TaskManagement.Web/.env.example` to `src/TaskManagement.Web/.env` and set `VITE_API_BASE_URL` explicitly.

## Run with Docker Compose

```bash
docker compose up --build
```

- Web: `http://localhost:5173`
- API: `http://localhost:5085`
- SQLite database is stored in the `task-data` volume

## Test commands

From the repository root:

```bash
dotnet test
```

Frontend:

```bash
cd src/TaskManagement.Web
npm test
npm run build
```

Full local verification used during development:

```bash
dotnet test
cd src/TaskManagement.Web
npm test
npm run build
```

## API overview

Base URL:

```text
/api/tasks
```

Endpoints:

- `GET /api/tasks`
- `GET /api/tasks/{id}`
- `GET /api/tasks/summary`
- `POST /api/tasks`
- `PUT /api/tasks/{id}`
- `PATCH /api/tasks/{id}/completion`
- `DELETE /api/tasks/{id}`

List query parameters:

- `status`: `all`, `active`, `completed`, `overdue`
- `search`: text search across title, description, and tags
- `priority`: `low`, `medium`, `high`
- `sort`: `createdAt`, `updatedAt`, `dueDate`, `priority`, `title`
- `direction`: `asc`, `desc`
- `page`: 1-based page number
- `pageSize`: 1-100
- `today`: optional `YYYY-MM-DD` override for deterministic overdue/due-today behavior

Example create request:

```json
{
  "title": "Prepare interview walkthrough",
  "description": "Record the happy path and edge cases.",
  "dueDate": "2026-05-15",
  "priority": "high",
  "tags": ["interview", "mvp"]
}
```

Example response:

```json
{
  "id": "8ed61029-8e07-4ff6-b5b7-105f2e6f19d9",
  "title": "Prepare interview walkthrough",
  "description": "Record the happy path and edge cases.",
  "status": "active",
  "priority": "high",
  "dueDate": "2026-05-15",
  "tags": ["interview", "mvp"],
  "createdAt": "2026-05-06T21:00:00Z",
  "updatedAt": "2026-05-06T21:00:00Z",
  "completedAt": null
}
```

## Date handling decision

Due dates are modeled as `DateOnly` on the backend and `YYYY-MM-DD` strings in the frontend. This is intentional. A task due date is a calendar date, not a moment in time. Using date-only values avoids timezone bugs where a task due today can appear overdue or due tomorrow depending on client locale or UTC conversion.

## Authentication scope

Authentication is not included in this version.

The current app is scoped as a single-user/local task manager so the implementation can focus on the requested task workflow, API/frontend contract, validation, persistence, date handling, and tests. If the app became a production multi-user product, authentication and task ownership would be added as first-class features.

A production version would use a real identity provider, associate tasks with stable user IDs, enforce authorization on every list/read/update/delete/summary endpoint, and include integration tests around user isolation.

## Assumptions and trade-offs

- Authentication is out of scope for this version so the implementation can stay focused on the requested task-management workflow.
- Since there is no auth, there is no user ownership model yet. In a multi-user version, tasks would reference a stable user ID and every API path would enforce ownership.
- The backend does not use repositories. EF Core is used directly from endpoint handlers because the app is small and the extra abstraction would mostly wrap `DbContext`.
- SQLite is used for local persistence and simple deployment. The API keeps request/response DTOs separate from the EF entity so the contract can evolve safely.
- Docker Compose is included for reproducible local startup, but the primary local dev loop remains `dotnet run` plus `npm run dev`.

## Future production improvements

If this moved beyond a take-home MVP, I would add:

- Production authentication and authorization using Google OAuth/OpenID Connect, with room for other identity providers or enterprise SSO integrations later
- Real user IDs, task ownership, and authorization checks on every read/update/delete/summary path
- Integration tests covering cross-user access prevention and expired/invalid session behavior
- EF migrations instead of `EnsureCreated`
- Optimistic concurrency tokens for edit conflicts
- End-to-end Playwright tests
- API rate limiting and structured request logging
- Observability: health checks, metrics, traces
- Recurring tasks and saved views
- Calendar-style visibility for due dates, upcoming work, scheduling, and workload planning
- External integrations such as Google Calendar or Microsoft 365 calendar sync once auth/account linking exists
- More robust tag search/indexing for larger datasets
- CI workflow for `dotnet test`, frontend tests, and builds
- Claude reviewer agent definitions for repeatable production checks, such as:
  - `.claude/agents/code-quality-reviewer.md` for maintainability, architecture, and test coverage
  - `.claude/agents/database-performance-reviewer.md` for SQL query plans, indexes, and EF Core query efficiency
  - `.claude/agents/auth-security-reviewer.md` for authentication, authorization, data ownership, and secure configuration
  - `.claude/agents/frontend-performance-reviewer.md` for bundle size, rendering behavior, accessibility, and browser performance
