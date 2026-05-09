# Swim Recruiting Tracker — CLAUDE.md

Living documentation for AI-assisted development. Update this file whenever you make architectural decisions, add features, or change the data model.

---

## Business Vision

Personal → Platform: This app starts as Parker's private recruiting tracker and is designed to evolve into a multi-student, multi-sport SaaS platform for NCAA transfer portal athletes.

**Target audience:** College athletes in the transfer portal — swimmers, then other sports.

**Revenue model (future):** Subscription or freemium (basic tracking free, AI research features paid). Pricing TBD — options include monthly per-athlete fee or one-time purchase.

**Key selling points:**
- AI-powered school research (coach info, academic rank, relay fit)
- Relay projection modeling (shows exactly what the athlete contributes to each relay)
- Scheduling and call tracking for the flood of inbound coach contacts
- Secretive data (offers, notes, coach conversations) stays private — auth required before launch

---

## Current Status (May 2026)

Parker is the sole user. App is local-only, no auth, no hosting. Data lives in `data/recruiting.db` (gitignored).

**Next milestones:**
1. Deploy to a hosted platform (Vercel + Turso, or Railway + SQLite volume)
2. Add NextAuth / Clerk for multi-user auth
3. Add payment gating (Stripe) for AI features
4. Expand to other sports (track & field, etc.)

---

## Architecture Decisions

### Multi-Tenant by Design

Even though there's only one user today, the schema is built for many:

- `students` table: Parker = row 1. Adding a new student = insert a row. No schema changes needed.
- `student_times`, `school_research`, `school_swimmers`, `relay_projections` all use `student_id` or `school_id` FKs that can be scoped per user later.
- When auth is added: add `user_id` to `students`, scope all queries by `WHERE student_id = current_user.student_id`.

### Auth Strategy (when ready)

- Use **NextAuth.js** or **Clerk** — don't build custom auth.
- Each user gets one (or more) students. Students are the primary data entity.
- Coaches, notes, offers are all private to the student — never shared.

### Database

- **SQLite via better-sqlite3** — synchronous, fast, zero infra for local dev.
- For hosting: migrate to **Turso** (SQLite-compatible, edge-hosted) or use a volume-mounted SQLite file on Railway/Fly.io.
- `data/recruiting.db` is gitignored. Schema is auto-created via `initSchema()` in `src/lib/db.ts`.
- **Never DROP or recreate tables.** Always use `CREATE TABLE IF NOT EXISTS` and additive-only migrations. Parker's data must never be destroyed.

### AI Research

- Uses **Anthropic SDK** (`@anthropic-ai/sdk`) with `claude-sonnet-4-6`.
- Web search tool: `web_search_20260209` (server-side, Anthropic-hosted).
- `stop_reason: 'pause_turn'` = web search hit 10-iteration internal limit → re-send messages in a loop (max 5 re-sends).
- Two AI-powered endpoints:
  - `POST /api/student/fetch-times` — fetches swimmer's SCY best times from SwimCloud
  - `POST /api/schools/[id]/research` — researches school coach, academics, roster, computes relay projections

### Relay Projection Logic

All relay math is in `src/lib/swim-utils.ts` — pure TypeScript, no AI arithmetic.

- **Free relays** (400 Free Relay, 800 Free Relay): Parker competes for one of the top 4 spots based on her event time vs. the school's roster.
- **Medley relays** (200 Medley Relay, 400 Medley Relay): Parker competes only for the backstroke leg (leg 1). Other legs use the school's best swimmer.
- Relay totals compared against `ncaa_relay_cuts` table (editable per year).

### NCAA Relay Cuts

Stored in `ncaa_relay_cuts` table, seeded with 2026 D1 Women's qualifying standards:
- 200 Medley Relay: 1:36.13
- 400 Medley Relay: 3:32.44
- 400 Free Relay: 3:13.50
- 800 Free Relay: 7:05.18

**These are best estimates — verify at ncaa.org before relying on them.** The UI labels them as "2026 NCAA D1 Women's qualifying standards" and includes a disclaimer.

---

## Expanding to Other Sports (Roadmap)

To add a new sport (e.g., track & field):

1. Add a `sports` config table with event definitions per sport (no code changes, data-driven).
2. Add a new student row with `sport = 'track'`.
3. The relay/event modeling is sport-specific — build a separate utils file (e.g., `track-utils.ts`) for that sport's projection logic.
4. Research prompt in `POST /api/schools/[id]/research` would need to be parameterized by sport.

This is designed so swimming stays untouched when adding new sports.

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx               — nav (Dashboard + Parker's Profile + Add School)
│   ├── page.tsx                 — Dashboard: stats, upcoming calls, school grid
│   ├── student/page.tsx         — Parker's profile: goals, SwimCloud sync, time editor
│   ├── schools/
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx         — School detail with AI research section
│   │       └── edit/page.tsx
│   └── api/
│       ├── schools/route.ts
│       ├── schools/[id]/route.ts
│       ├── schools/[id]/activities/route.ts
│       ├── schools/[id]/research/route.ts  ← AI research + relay projections
│       ├── activities/[id]/route.ts
│       ├── student/route.ts
│       ├── student/times/route.ts
│       └── student/fetch-times/route.ts    ← SwimCloud AI lookup
├── lib/
│   ├── db.ts                    — SQLite singleton, schema init, seeds
│   ├── types.ts                 — All TypeScript interfaces
│   └── swim-utils.ts            — Time parsing + relay projection math
└── components/
    ├── ResearchSection.tsx      — AI research + relay projections (client component)
    ├── ActivityLog.tsx
    ├── SchoolCard.tsx
    ├── SchoolForm.tsx
    ├── StatsHeader.tsx
    ├── UpcomingCalls.tsx
    └── ...
```

---

## Data That Must Never Be Lost

Parker's data is sacred. Never:
- DROP or recreate existing tables
- Change schema in ways that lose rows
- Seed data if the table is non-empty (all seeds check `COUNT(*) > 0` first)

The `schools`, `activities`, `students`, and `student_times` tables hold real recruiting data.

---

## Environment

- `ANTHROPIC_API_KEY` — required for AI features (fetch-times and research endpoints)
- No other env vars required for local dev
- For production: add `DATABASE_URL` if migrating to Turso/Postgres
