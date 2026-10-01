# TicketFlow — Media Cell Support Portal

A corporate internal ticketing system built for the Media Cell department to report issues, track progress, and collaborate with support teams across the organisation.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)

## Features

### Phase 1 ✅
- **Authentication** — Google OAuth + dev login switcher
- **New Ticket** — Photo-first form with camera capture, upload, Ctrl+V paste, and client-side compression
- **My Tickets** — Filterable list with search, status/priority chips, and mini progress bars
- **Ticket Detail** — Animated stepper tracker, photo gallery with zoom, activity log timeline

### Phase 2 ✅
- **Agent Queue** — Priority-sorted queue with multi-filter, quick assign-to-me
- **Status Changes** — Full lifecycle management (New → Assigned → In Progress → Resolved → Closed)
- **Comments** — Comment thread with internal notes (agent-only), first response tracking
- **Audit Log** — Complete activity history on every ticket
- **Email Notifications** — On ticket creation, assignment, status change, comments (console fallback)

### Phase 3 ✅
- **Dashboard** — KPI cards, status/priority/category/member charts, overdue alerts, avg resolution time
- **CSV Export** — Export filtered tickets to CSV
- **Admin Panel** — User management table, category management
- **SLA Configuration** — Configurable first-response and resolution targets per priority

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Prisma ORM + SQLite (local) / PostgreSQL (prod) |
| Auth | NextAuth.js (Google OAuth, swappable to Microsoft) |
| Email | Nodemailer (SMTP / console fallback) |
| File Storage | Local `/uploads` (swappable to S3/Drive) |
| Icons | Lucide React |

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
# 1. Clone and install
cd ticket-system
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings (SQLite works out of the box)

# 3. Set up database and seed data
npx prisma db push
npx tsx prisma/seed.ts

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Dev Login
In development mode, the login page shows a user switcher. Click any user to sign in instantly and test different roles:
- **Requester** — Creates tickets, sees only their own
- **Media Head** — Sees all Media Cell tickets + dashboard
- **Agent** — Sees their category queue, assigns, resolves tickets
- **Admin** — Full access + user/category management

### Database Commands

```bash
npm run db:push      # Push schema to DB
npm run db:seed      # Seed sample data
npm run db:setup     # Push + seed in one command
npm run db:studio    # Open Prisma Studio (DB browser)
npm run db:generate  # Regenerate Prisma client
```

## Data Model

```
users → tickets (requester)
users → tickets (assignee)
tickets → comments → attachments
tickets → attachments (direct)
tickets → audit_log
users → agent_categories → categories
sla_config (per priority)
```

### Roles
| Role | Permissions |
|------|------------|
| `requester` | Create tickets, view own, comment, cancel, reopen |
| `media_head` | View all department tickets, dashboard, stats |
| `agent` | View category queue, assign, change status, internal notes |
| `admin` | Everything + user/category management |

### Ticket Lifecycle
```
New → Assigned → In Progress → Resolved → Closed
                    ↕
          Waiting on Requester

Requester can Cancel before work starts.
Requester can Reopen from Resolved → Assigned.
Resolved auto-closes after 3 days (TODO: cron).
```

## Seed Data
- **20 Media Cell members** (requesters)
- **1 Media Head** (Arjun Mehta)
- **10 Agents** (one per category)
- **1 Admin**
- **10 Categories** (Computer/IT, Internet/Network, Camera & Equipment, etc.)
- **3 Sample Tickets** with audit logs
- **SLA Defaults** (Urgent: 1h/4h, High: 4h/1d, Medium: 1d/3d, Low: 2d/5d)

## Configuration

See `.env.example` for all settings:
- `DATABASE_URL` — SQLite (local) or PostgreSQL connection string
- `GOOGLE_CLIENT_ID/SECRET` — Google OAuth credentials
- `ALLOWED_DOMAIN` — Restrict login to organisation domain
- `SMTP_*` — Email settings (leave blank for console logging)
- `UPLOAD_DIR` — File storage directory

## Production Deployment

1. Switch `DATABASE_URL` to PostgreSQL
2. Set `NEXTAUTH_SECRET` to a strong random string
3. Configure Google OAuth with your production domain
4. Set `ALLOWED_DOMAIN` to your organisation's email domain
5. Configure SMTP for real email delivery
6. Run `npx prisma migrate deploy` (create migrations first)
7. Build and deploy: `npm run build && npm start`

## Replacing Seed Data

Edit `prisma/seed.ts` with your actual team members, then re-run:
```bash
npx prisma db push --force-reset
npx tsx prisma/seed.ts
```

## License

Internal use only.
