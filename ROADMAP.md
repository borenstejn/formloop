# ROADMAP — formloop

What's done, what's next.

---

## Done

### Core engine

- 10+ question types (mc, multi, text, textarea, yn, number, scale, html-pick, rank, scale-preview, html context, group)
- Typeform-clone UI with vertical-slide transitions, keyboard shortcuts, mobile-friendly
- Split and stack layout modes
- API endpoints (create, submit, retrieve, list submissions, CSV export)
- Local-first with in-memory storage (zero config)
- Optional Upstash Redis for persistent/hosted deployments
- DOMPurify HTML sanitization
- Optional API auth via shared secret
- Persistent forms with multi-respondent support

### MCP server

- Stdio transport via `@modelcontextprotocol/sdk`
- 3 tools: `create_form`, `wait_for_response`, `list_submissions`
- Auto-starts local HTTP server when needed
- One-command install: `npx formloop install`

### CLI

- `npx formloop create --spec '{...}'` — create a form
- `npx formloop wait --form-id <ID>` — poll for submission
- `npx formloop list --form-id <ID>` — list persistent form submissions
- Auto-opens form URL in browser

### Python SDK

- `ask_form.py` CLI with create, wait, list-submissions, export-csv, wait-n
- Auto-detects and auto-starts local server
- Zero external dependencies

---

## Next

### Developer experience

- [ ] TypeScript SDK (`@formloop/sdk`) — `createForm`, `waitForResponse`, `listSubmissions`
- [ ] Examples for major agent frameworks (OpenAI Assistants, LangChain, Vercel AI SDK)
- [ ] Form spec validation / preview mode (`?preview=1`)
- [ ] Form templates (design-shotgun, code-review, ticket-triage, etc.)

### Infrastructure

- [ ] Docker Compose for one-command self-hosting (server + Redis)
- [ ] GitHub Actions CI (lint, typecheck, build)
- [ ] Vitest tests for React components
- [ ] Pytest tests for the Python SDK

### Integrations

- [ ] Slack/Discord webhook delivery
- [ ] Storage adapter pattern (Postgres, SQLite)

### Polish

- [ ] Documentation site (Mintlify or Nextra)
- [ ] Logo + landing page
- [ ] README hero GIF (html-pick in action)
- [ ] PyPI publish (`pip install formloop`)
- [ ] npm publish (`npx formloop`)

---

## Risk register

| Risk | Mitigation |
|---|---|
| Platform vendors ship native equivalent | Position as framework-agnostic, self-hostable, local-first |
| Confused with form builders (Tally, Typeform) | Pitch is clear: "for LLM agents, not for humans" |
| HumanLayer encroaches on UI | Propose integration — their delivery + our UI |
