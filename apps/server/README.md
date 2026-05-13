# formloop-server

Next.js server powering the formloop form engine.

## Two modes

**Ephemeral (default).** Spec TTL 24h, single submission, TTL 1h, overwrites on
resubmit. Ideal for the 1-shot "agent asks human → human answers → agent
resumes" loop. No long-term storage.

**Persistent (opt-in via `spec.persistent: true`).** Spec stored without TTL.
Submissions appended under a Redis list (multi-respondent). Retrievable via
auth-gated list + CSV export endpoints. Required for team-wide decisions like
the Simundia code-review-rule vote.

## Routes

- `POST /api/forms?secret=...` — create a form (ephemeral or persistent)
- `GET /forms/[id]` — public form page
- `POST /api/forms/[id]/submit` — public submit endpoint
- `GET /api/forms/[id]/submissions?secret=...` — list all submissions (persistent only)
- `GET /api/forms/[id]/export.csv?secret=...` — CSV export (persistent only)
- `GET /api/response/[id]?secret=...` — read single response (ephemeral only)
- `POST /api/webhook` — legacy Tally webhook receiver

## Auth

All `secret=` query-param routes require `WEBHOOK_SECRET` to match the env var.
Constant-time compare. Public form rendering and submit are open by design — the
form ID is the capability.

## Env

```
WEBHOOK_SECRET       # shared secret for auth-gated endpoints
KV_REST_API_URL      # Upstash Redis REST URL
KV_REST_API_TOKEN    # Upstash Redis REST token
PUBLIC_BRIDGE_URL    # (optional) override the public origin used in form_url
```
