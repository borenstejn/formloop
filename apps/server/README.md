# tally-bridge

Webhook bridge between Tally.so and Claude Code sessions.

Tally form → POST /api/webhook → Upstash Redis (TTL 1h)
Claude session → GET /api/response/[formId] → returns submission data

Used by the local Claude Code skill `/ask-form` to ask the user structured
questions via a generated Tally form during a session.

## Routes

- `POST /api/webhook?secret=...` — called by Tally on form submission
- `GET /api/response/[formId]?secret=...` — polled by Claude session

## Auth

Both routes require `?secret=...` matching `WEBHOOK_SECRET` env var.
