# ReachInbox ("ONE") — Cold Email Outreach Scheduler

A production-grade, highly reliable cold email outreach platform built to the **Outbox Labs Assignment Figma Design ("ONE" Outbound Email Client)**.

Authenticated users compose campaigns, upload lead lists (CSV/TXT), and schedule staggered sends with configurable start times, per-email delays, and hourly caps.

The platform guarantees **strict idempotency (zero double-sends)**, **recovers gracefully from server restarts**, **atomically enforces hourly rate limits across multiple concurrent workers using Redis Lua scripts**, **indexes sent emails in Elasticsearch for instant sub-millisecond search**, **surfaces queue metrics via Bull Board**, and **dispatches deduped Slack alerts on rate-limit events**.

---

## Table of Contents

1. [Quickstart: How to Run the Application](#1-quickstart-how-to-run-the-application)
   - [How to Run Backend (Express, Redis, MySQL DB, BullMQ Worker)](#how-to-run-backend)
   - [How to Run Frontend (React, Vite, Figma UI)](#how-to-run-frontend)
2. [Ethereal Email & Environment Setup Guide](#2-ethereal-email--environment-setup-guide)
   - [How Ethereal Email Works & How to Set It Up](#how-ethereal-email-works)
   - [Environment Variables Reference](#environment-variables-reference)
3. [Architecture Overview](#3-architecture-overview)
   - [Architecture Diagram](#architecture-diagram)
   - [How Scheduling Works (Staggered Delays)](#how-scheduling-works)
   - [How Persistence on Restart is Handled (Zero Double-Sends)](#how-persistence-on-restart-is-handled)
   - [How Rate Limiting & Concurrency are Implemented (Redis Lua)](#how-rate-limiting--concurrency-are-implemented)
4. [List of Implemented Features (Backend & Frontend)](#4-list-of-implemented-features)
   - [Backend Features](#backend-features)
   - [Frontend Features (Figma Aligned)](#frontend-features-figma-aligned)
5. [Automated Test Suite & Verification](#5-automated-test-suite--verification)
6. [Demo Walkthroughs](#6-demo-walkthroughs)
   - [Demo 1: Staggered Scheduling & Ethereal Delivery](#demo-1-staggered-scheduling--ethereal-delivery)
   - [Demo 2: Server Restart Recovery & Idempotency](#demo-2-server-restart-recovery--idempotency)
   - [Demo 3: Hourly Rate Limiting & Deduped Slack Alerts](#demo-3-hourly-rate-limiting--deduped-slack-alerts)
7. [Scale & Architecture Trade-offs (1,000 to 100,000+ Jobs)](#7-scale--architecture-trade-offs)

---

## 1. Quickstart: How to Run the Application

### Prerequisites
- Node.js >= 18.0.0
- Docker Desktop / Docker Engine running
- npm >= 9.0.0

---

### How to Run Backend

The backend incorporates the **Express REST API**, **BullMQ delayed queue**, **Ethereal SMTP worker**, and connections to **MySQL 8**, **Redis 7**, and **Elasticsearch 8**.

#### Step 1: Start Supporting Services (Docker)
Run Docker Compose in the project root:
```bash
docker compose up -d
```
This boots 3 isolated, healthy containers:
* **MySQL 8.0:** Running on port `3307` (`reachinbox_mysql`) *(mapped to 3307 to avoid local Mac port 3306 collisions)*.
* **Redis 7.0:** Running on port `6379` (`reachinbox_redis`).
* **Elasticsearch 8.11.0:** Running on port `9200` (`reachinbox_elasticsearch`).

Verify services are healthy:
```bash
docker ps
```

#### Step 2: Configure Environment File
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
cp .env backend/.env
```
*(The defaults in `.env` are already pre-configured for local Docker and dev reviewer mode).*

#### Step 3: Run Database Migrations
Push the Prisma relational schema to MySQL:
```bash
npm --workspace=backend run prisma:push
```

#### Step 4: Start Backend in Development Mode
```bash
npm --workspace=backend run dev
```
* The Express server starts on **`http://localhost:5001`**.
* The BullMQ worker initializes with `WORKER_CONCURRENCY=5`.
* The startup recovery reconciliation checks for any interrupted jobs.
* Health check: `curl http://localhost:5001/api/health` returns `{"success": true, "data": {"status": "healthy"}}`.
* Bull Board Queue UI is mounted at **`http://localhost:5001/admin/queues`**.

---

### How to Run Frontend

The frontend is built with **React 18**, **TypeScript**, **Tailwind CSS**, and **Vite**, exactly replicating the **Figma "ONE" Outbound Email Client design**.

In a **new terminal tab**:
```bash
npm --workspace=frontend run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

All API requests (`/api`, `/auth`, `/admin`) are proxied via Vite to the backend running on `http://localhost:5001`.

---

## 2. Ethereal Email & Environment Setup Guide

### How Ethereal Email Works

[Ethereal](https://ethereal.email) is a fake SMTP service created by Nodemailer for safely testing email delivery. Emails sent to Ethereal **never reach real mailboxes**, preventing unintended outreach or spam violations, while providing a real web URL to preview the delivered email.

#### Option A: Automatic Test Account (Zero Setup Required)
If `SMTP_USER` and `SMTP_PASSWORD` are left empty in `.env`, the backend **automatically generates a free Ethereal test account on startup via `nodemailer.createTestAccount()`**:
```
📬 No SMTP credentials specified. Auto-generating Ethereal test account...
✅ Generated Ethereal Test Account:
   User: ethereal_user_xxx@ethereal.email
   Web Interface: https://ethereal.email/messages
```
Every sent email logs an interactive test preview URL:
```
🔗 Ethereal Preview URL: https://ethereal.email/message/WaQKMgK...
```

#### Option B: Manual Ethereal Credentials (Optional)
If you want persistent test credentials:
1. Visit [https://ethereal.email/create](https://ethereal.email/create).
2. Click **Create Ethereal Account**.
3. Copy your generated `User` and `Password`.
4. Paste them into your `.env` and `backend/.env`:
   ```env
   SMTP_HOST=smtp.ethereal.email
   SMTP_PORT=587
   SMTP_USER=your_username@ethereal.email
   SMTP_PASSWORD=your_password
   SMTP_FROM="ReachInbox Outreach <no-reply@reachinbox.ai>"
   ```

---

### Environment Variables Reference

| Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `PORT` | Yes | `5001` | Backend HTTP server port (set to 5001 to avoid macOS AirPlay Receiver port 5000) |
| `FRONTEND_URL` | Yes | `http://localhost:5173` | Frontend client origin for CORS and OAuth redirects |
| `DATABASE_URL` | Yes | `mysql://root:rootpassword@127.0.0.1:3307/reachinbox` | MySQL connection string |
| `REDIS_URL` | Yes | `redis://127.0.0.1:6379` | Redis connection URL for BullMQ queues and Lua rate-limiting |
| `ELASTICSEARCH_URL` | Yes | `http://127.0.0.1:9200` | Elasticsearch node cluster endpoint for full-text search |
| `GOOGLE_CLIENT_ID` | Optional | `your-google-client-id` | Google Cloud Console OAuth 2.0 Client ID (optional in dev) |
| `GOOGLE_CLIENT_SECRET`| Optional | `your-google-client-secret` | Google Cloud Console OAuth 2.0 Client Secret (optional in dev) |
| `GOOGLE_CALLBACK_URL` | Yes | `http://localhost:5001/auth/google/callback` | Authorized Google OAuth redirect URI |
| `SLACK_CLIENT_ID` | Optional | `your-slack-app-id` | Slack API App Client ID |
| `SLACK_CLIENT_SECRET`| Optional | `your-slack-secret` | Slack API App Client Secret |
| `SLACK_REDIRECT_URI` | Yes | `http://localhost:5001/api/slack/callback` | Authorized Slack OAuth redirect URI |
| `SMTP_HOST` | Yes | `smtp.ethereal.email` | SMTP host |
| `SMTP_PORT` | Yes | `587` | SMTP port |
| `SMTP_USER` | Optional | `""` (auto-generates) | Ethereal username |
| `SMTP_PASSWORD` | Optional | `""` (auto-generates) | Ethereal password |
| `SMTP_FROM` | Yes | `"ReachInbox Outreach <no-reply@reachinbox.ai>"` | Default sender email header |
| `WORKER_CONCURRENCY` | Yes | `5` | Number of simultaneous email dispatch jobs processed per worker |
| `EMAIL_DELAY_MS` | Yes | `2000` | Default delay between emails in milliseconds |
| `MAX_EMAILS_PER_HOUR`| Yes | `200` | Default hourly sending limit per user |
| `SESSION_SECRET` | Yes | `reachinbox_super_secret_jwt_session_key_32bytes_min_length` | Secret key for signing JWTs and AES-256-GCM token encryption |

---

## 3. Architecture Overview

### Architecture Diagram

```
React Frontend (Figma "ONE" Client)
                 │
            REST API (JSON Envelope: { success: true, data: T })
                 │
        Express (TypeScript on Port 5001)
 ┌───────────────┼────────────────────────┐
 ▼               ▼                        ▼
MySQL 8.0     Redis 7.0 (Cache/Lua)   Elasticsearch 8.11
(Prisma ORM)        │                 (Full-text Search Sync)
Source of Truth     ▼
              BullMQ Delayed Queue
                    │
        Worker Pool (WORKER_CONCURRENCY)
                    │
            Ethereal SMTP (Nodemailer)
```

---

### How Scheduling Works

1. **Lead Ingestion & Deduplication:**  
   When a user uploads a CSV/TXT lead list or pastes emails, `leadParser.service.ts` trims whitespace, normalizes emails to lowercase, removes internal duplicates, and isolates invalid RFC syntax entries with line numbers and reasons.
2. **Atomic DB Persistence:**  
   Before any jobs touch Redis or BullMQ, `campaign.service.ts` creates the `Campaign` record and individual `EmailJob` records in MySQL inside a single Prisma atomic transaction in `PENDING` status.
3. **Staggered Delay Calculation (No Bursts):**  
   Rather than bursting all recipients at once, each recipient's target send time is computed as:
   $$\text{scheduledAt}_i = \text{startTime} + (i \times \text{delayBetweenEmailsMs})$$
   $$\text{delayMs} = \max(0, \text{scheduledAt}_i - \text{currentTime})$$
4. **Deterministic BullMQ Queueing:**  
   Jobs are ingested into BullMQ (`email-dispatch-queue`) with a custom `jobId: emailJob.id`. BullMQ guarantees that a job with that ID cannot be queued twice.

---

### How Persistence on Restart is Handled (Zero Double-Sends)

The system survives process crashes, server restarts, and worker restarts without duplicate sends:

1. **Redis Persistence:**  
   BullMQ delayed and waiting jobs remain persisted in Redis across process restarts.
2. **Atomic Idempotent Claim (SQL Row-Level Lock):**  
   When a worker thread claims a job, it executes an atomic SQL query before touching the SMTP transport:
   ```sql
   UPDATE EmailJob 
   SET status = 'PROCESSING', attempts = attempts + 1, updatedAt = NOW()
   WHERE id = ? AND status IN ('PENDING', 'DELAYED', 'RATE_LIMITED')
   ```
   If the affected rows count is `0`, another worker has already claimed or dispatched the job. The worker aborts execution immediately.
3. **Startup Reconciliation Engine (`recovery.service.ts`):**  
   On backend boot, the server scans MySQL for any jobs stuck in `PROCESSING` state that were interrupted mid-flight before the shutdown. It safely resets them to `PENDING` and re-enqueues them into BullMQ.
4. **Sent Stays Sent:**  
   Any email marked `SENT` with a `sentAt` timestamp is immutable. Workers will never re-process it.

---

### How Rate Limiting & Concurrency are Implemented

1. **Sliding Hourly Window Math:**  
   The hourly window is calculated as:
   $$\text{hourWindow} = \lfloor \text{currentTime} / 3600000 \rfloor$$
2. **Atomic Redis Lua Counter:**  
   Instead of in-memory rate limiting, the worker executes an atomic Lua script on Redis key `email_rate_limit:{userId}:{hourWindow}`:
   ```lua
   local current = redis.call('get', KEYS[1])
   if current and tonumber(current) >= tonumber(ARGV[1]) then
     return -1
   else
     local val = redis.call('incr', KEYS[1])
     if val == 1 then
       redis.call('expire', KEYS[1], ARGV[2])
     end
     return val
   end
   ```
   This is 100% thread-safe and correct across multiple clustered worker nodes.
3. **No Dropped or Failed Jobs:**  
   When the hourly cap is reached, the job is **never dropped or failed**. The worker marks the record as `RATE_LIMITED`, computes the start timestamp of the next hour window ($(\text{hourWindow} + 1) \times 3600000$), and re-delays the job to that window.
4. **Deduped Slack Alerts:**  
   On the first rate-limit occurrence in a window, a notification is sent to the user's connected Slack workspace, and a deduplication key `slack_notified:{userId}:{hourWindow}` is set in Redis (TTL: 3600s). Subsequent jobs in that same window skip notification to prevent spamming the user.
5. **Configurable Concurrency:**  
   The worker pool concurrency is driven by `WORKER_CONCURRENCY` (default: 5) using BullMQ's native concurrency model.

---

## 4. List of Implemented Features

### Backend Features

| Feature | Description | Implementation File(s) |
|---|---|---|
| **Staggered Scheduler** | Non-burst scheduling with calculated delays per recipient | [`campaign.service.ts`](file:///Users/mistysoni/Desktop/outboxLabs/backend/src/services/campaign.service.ts), [`emailQueue.ts`](file:///Users/mistysoni/Desktop/outboxLabs/backend/src/queue/emailQueue.ts) |
| **Crash Persistence** | MySQL transaction source-of-truth + BullMQ Redis persistence | [`emailJob.repository.ts`](file:///Users/mistysoni/Desktop/outboxLabs/backend/src/repositories/emailJob.repository.ts), [`recovery.service.ts`](file:///Users/mistysoni/Desktop/outboxLabs/backend/src/services/recovery.service.ts) |
| **Atomic Idempotency** | Atomic row claim query strictly preventing duplicate sends | [`emailProcessor.ts`](file:///Users/mistysoni/Desktop/outboxLabs/backend/src/queue/emailProcessor.ts) |
| **Hourly Rate Limiter** | Redis Lua script counter with next-hour rollover rescheduling | [`rateLimiter.service.ts`](file:///Users/mistysoni/Desktop/outboxLabs/backend/src/services/rateLimiter.service.ts) |
| **Worker Concurrency** | Configurable worker pool (`WORKER_CONCURRENCY`) | [`emailWorker.ts`](file:///Users/mistysoni/Desktop/outboxLabs/backend/src/queue/emailWorker.ts) |
| **Elasticsearch Sync** | Automatic document sync on send and `multi_match` queries | [`elasticsearch.service.ts`](file:///Users/mistysoni/Desktop/outboxLabs/backend/src/services/elasticsearch.service.ts) |
| **Ethereal SMTP** | Auto-generating test credentials & capture of preview URLs | [`emailSender.service.ts`](file:///Users/mistysoni/Desktop/outboxLabs/backend/src/services/emailSender.service.ts) |
| **Bull Board Dashboard** | Web-based queue management mounted at `/admin/queues` with auth | [`adminQueue.routes.ts`](file:///Users/mistysoni/Desktop/outboxLabs/backend/src/routes/adminQueue.routes.ts) |
| **Google & Slack OAuth** | Real OAuth with AES-256-GCM token encryption at rest | [`googleAuth.service.ts`](file:///Users/mistysoni/Desktop/outboxLabs/backend/src/services/googleAuth.service.ts), [`slack.routes.ts`](file:///Users/mistysoni/Desktop/outboxLabs/backend/src/routes/slack.routes.ts) |
| **Lead Parser** | RFC-compliant email extraction, CSV header detection & duplicates | [`leadParser.service.ts`](file:///Users/mistysoni/Desktop/outboxLabs/backend/src/services/leadParser.service.ts) |

---

### Frontend Features (Figma Aligned)

The UI replicates the **Figma "ONE" Outbound Email Client Design**:

| Feature | Description | Implementation File |
|---|---|---|
| **1️⃣ Login Screen** | Centered white card, mint Google button, standard credentials, and instant reviewer sign-in | [`LoginView.tsx`](file:///Users/mistysoni/Desktop/outboxLabs/frontend/src/components/LoginView.tsx) |
| **2️⃣ Sidebar Navigation** | **`ONE`** brand typography, profile card (`Oliver Brown`), green outlined **`Compose`** CTA, and Core tabs | [`Sidebar.tsx`](file:///Users/mistysoni/Desktop/outboxLabs/frontend/src/components/Sidebar.tsx) |
| **3️⃣ Compose New Email** | `From`, `To` (with **`↑ Upload List`** and recipient chips), `Delay` (sec), `Hourly Limit` (/hr), rich text toolbar | [`ComposeModal.tsx`](file:///Users/mistysoni/Desktop/outboxLabs/frontend/src/components/ComposeModal.tsx) |
| **3️⃣ Send Later Popover** | Figma clock popover with date-time picker and presets (`Tomorrow`, `Tomorrow, 10:00 AM`, etc.) | [`ComposeModal.tsx`](file:///Users/mistysoni/Desktop/outboxLabs/frontend/src/components/ComposeModal.tsx) |
| **4️⃣ Scheduled Emails** | Orange scheduled time badges (`🕒 Tue 9:15:12 AM`), recipient, subject snippet, star toggles, empty/loading states | [`ScheduledView.tsx`](file:///Users/mistysoni/Desktop/outboxLabs/frontend/src/components/ScheduledView.tsx) |
| **5️⃣ Sent Emails Table** | Grey `Sent` pill badges, star toggles, and live **Elasticsearch search box** | [`SentView.tsx`](file:///Users/mistysoni/Desktop/outboxLabs/frontend/src/components/SentView.tsx) |
| **5️⃣ Email Details View** | Full email view with Amanda Clark sender avatar, yellow callout box (`⚡ Extremely Exclusive... ⚡`), and attachment cards | [`EmailDetailView.tsx`](file:///Users/mistysoni/Desktop/outboxLabs/frontend/src/components/EmailDetailView.tsx) |
| **Queue Inspection Link** | Direct link to Bull Board at `/admin/queues` with live worker pulse | [`Sidebar.tsx`](file:///Users/mistysoni/Desktop/outboxLabs/frontend/src/components/Sidebar.tsx) |

---

## 5. Automated Test Suite & Verification

The project includes **18 test suites** containing **61 automated unit and integration tests** executing via Jest and Supertest.

Run the test suite:
```bash
npm test
```

### Test Summary Output
```
PASS src/concurrency.test.ts
  Phase 13: Concurrency, Scaling & Integration Tests
    ✓ should allow exactly 1 worker to claim a job when 5 workers race concurrently
    ✓ should generate distinct Redis rate limit keys across different hour windows
    ✓ should accurately calculate staggered schedules for 1,000 recipients without drift

PASS src/routes/email.routes.test.ts
  Phase 6: Email Query & Dashboard Stats Routes
    ✓ GET /api/emails/scheduled should return paginated scheduled jobs
    ✓ GET /api/emails/sent should return paginated sent jobs
    ✓ GET /api/dashboard/stats should return aggregated counts
    ✓ GET /api/emails/search should query Elasticsearch scoped to user

PASS src/queue/emailProcessor.test.ts
  Phase 6 & 7: Email Job Processor & Rate Limiting Transitions
    ✓ should send email and mark status as SENT when rate limit allows
    ✓ should abort email dispatch immediately if atomic claim fails (zero double-sends)
    ✓ should reschedule job without failing when hourly limit is reached
    ✓ should mark job as FAILED when SMTP throws and max attempts are exceeded

PASS src/services/rateLimiter.service.test.ts
  Phase 7: Redis-Backed Hourly Rate Limiter Service
    ✓ should compute exact 1-hour window indices
    ✓ should compute start timestamp of next window
    ✓ should allow send when below hourly limit
    ✓ should reject send and provide retryAfterMs when at or above limit

PASS src/services/recovery.service.test.ts
  Phase 8: Recovery Service & Restart Reconciliation
    ✓ should return 0 when no stale PROCESSING jobs exist
    ✓ should find stale PROCESSING jobs, reset to PENDING, and re-enqueue them

Test Suites: 18 passed, 18 total
Tests:       61 passed, 61 total
Snapshots:   0 total
Time:        3.186 s
```

---

## 6. Demo Walkthroughs

### Demo 1: Staggered Scheduling & Ethereal Delivery
1. Open `http://localhost:5173` and click **Login** (or use **Login with Google**).
2. Click **Compose** in the sidebar.
3. In the To field, type or upload 3 emails (e.g. `alex@innovate.co, jordan@scaleup.io, taylor@venture.org`).
4. Set **Delay between 2 emails** to `2` seconds.
5. Click **Send**:
   * Email 1 dispatches at $T_0$.
   * Email 2 dispatches at $T_0 + 2\text{s}$.
   * Email 3 dispatches at $T_0 + 4\text{s}$.
6. Switch to the **Sent** tab: click on any email to open the full **Email Details View**, or copy the Ethereal message preview URL to inspect it in your browser.

---

### Demo 2: Server Restart Recovery & Idempotency
1. Schedule a campaign with 10 emails and a 5-second delay (`delay: 5` sec).
2. After 2 emails have sent, kill the backend server process (`Ctrl+C`).
3. Inspect state:
   - MySQL persists 2 `SENT` jobs and 8 `PENDING` / `DELAYED` jobs.
   - Redis persists the remaining BullMQ jobs.
4. Restart the backend (`npm --workspace=backend run dev`):
   - Notice the startup recovery check:
     ```
     🔄 [Startup Recovery] All email jobs clean. No stale PROCESSING jobs found.
     👷 Email worker initialized with concurrency: 5
     ```
   - BullMQ immediately resumes processing remaining delayed jobs at their scheduled times.
   - **Zero double-sends occur.**

---

### Demo 3: Hourly Rate Limiting & Deduped Slack Alerts
1. Click **Compose** with an **Hourly Limit** of `2` emails/hr and 5 recipient leads.
2. Observe execution:
   - Emails 1 and 2 are dispatched immediately via Ethereal.
   - Email 3 hits the Redis Lua rate limiter (`current: 2 >= limit: 2`).
   - Emails 3, 4, and 5 are marked `RATE_LIMITED` and moved to the next hour window.
   - A single Slack notification is dispatched to your connected Slack channel.
   - Subsequent rate-limited jobs in the same window check `slack_notified:{userId}:{hourWindow}` and deduplicate, preventing alert spam.

---

## 7. Scale & Architecture Trade-offs

### 1,000 to 100,000+ Scheduled Jobs Analysis

#### 1. Queue Scheduling Strategy: Redis ZSETs vs. Chunking
* **Current Implementation:** Each recipient is scheduled as a delayed job in BullMQ backed by a Redis Sorted Set (`zadd` on target timestamp). For 1,000 to 10,000 jobs, Redis handles this in single-digit milliseconds with minimal memory overhead (~250 bytes per job).
* **At 100,000+ Jobs:** Rather than enqueuing 100,000 individual delayed jobs into Redis at campaign creation time (which would consume ~25MB of Redis memory in one burst), a production system uses a **Parent-Chunking Pattern**:
  - The campaign is stored in MySQL.
  - A batch orchestrator job triggers every 15 minutes to pull the next chunk of 1,000 jobs due in that window and enqueue them into BullMQ.

#### 2. Atomic Rate Limiting Under High Concurrency
* **Current Implementation:** We use an atomic Redis Lua script on `email_rate_limit:{userId}:{hourWindow}`. Because Redis executes Lua scripts single-threaded and atomically, 100 concurrent worker threads will never experience a race condition or exceed the hourly cap.
* **Trade-off:** In a distributed multi-region Redis cluster, key hashes must map to the same node via hash tags (e.g. `{rate_limit:userId}:hourWindow`).

#### 3. Database Idempotency & Row Contention
* **Current Implementation:** Raw atomic SQL updates (`UPDATE EmailJob SET status = 'PROCESSING' WHERE id = ? AND status IN ('PENDING', 'DELAYED', 'RATE_LIMITED')`) prevent double-sends by verifying affected row count ($=1$).
* **At Scale:** Using MySQL InnoDB row-level locking on primary keys ensures workers do not lock the whole table. Secondary indexes on `(userId, status, scheduledAt)` guarantee fast index-range lookups.

#### 4. Elasticsearch Ingestion Throughput
* **Current Implementation:** Jobs are indexed individually upon send completion.
* **At 100,000+ Jobs:** Direct single-document indexing adds network latency to the worker. We introduce a **Bulk Indexing Buffer**:
  - The worker appends sent message IDs to a Redis stream or buffer.
  - An ES bulk indexer worker flushes documents in batches of 500 via the Elasticsearch `_bulk` API.
