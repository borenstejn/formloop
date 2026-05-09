# ROADMAP — formloop

The plan to take formloop from "POC that works for me" to "OSS project with 1000+ stars."

Estimated total: **4-6 weeks of focused effort**, not full-time.

---

## Phase 0 — Pre-launch foundation (current)

**Status:** Done as of 2026-05-09. Server works, Python SDK works, end-to-end tested.

What's already in `apps/server/`:
- 10 question types (mc, multi, text, textarea, yn, number, scale, html-pick, rank, scale-preview, html context)
- Typeform-clone UI with vertical-slide transitions, keyboard shortcuts, mobile-friendly
- API endpoints (create, submit, retrieve)
- Auth via shared secret
- DOMPurify sanitization
- Vercel deployment + Upstash Redis storage

What's already in `packages/sdk-python/`:
- `ask_form.py` CLI: create-custom, wait, cleanup
- Working against the live deployment

---

## Phase 1 — Discovery & validation (3-5 days)

Before investing 4 more weeks, validate that other people actually want this.

### Tasks

- [ ] **Naming validated** (current: `formloop` — verify npm + GitHub availability)
- [ ] **Pitch refined** — get to a single clear sentence
- [ ] **Talk to 5-10 people** in Jérôme's network who build with LLMs:
  - Show the demo URL
  - Ask: "Would you use this in your workflow?"
  - Ask: "What types of questions would you ask through this?"
  - Ask: "What's missing for you to actually adopt it?"
- [ ] **Decision gate**: if signal is positive → continue to Phase 2. If tepid → keep as personal tool, don't invest more.
- [ ] **Domain check**: register `formloop.dev` and/or `getformloop.com` if available

### Outcome

A clear go/no-go decision, plus a list of the 3-5 most-requested features from real potential users.

---

## Phase 2 — Productisation (1.5-2 weeks)

Make the project usable by people who aren't Jérôme.

### Server side

- [ ] **Decouple branding** from `tally-bridge` (Vercel project rename or new project)
- [ ] **Self-hostable**: Docker Compose with `server` + `redis` for one-command local hosting
- [ ] **Public demo**: deploy a stable demo at `formloop.dev` (or wherever)
- [ ] **API auth flexibility**: support both shared secret AND per-form tokens
- [ ] **Optional persistent history**: opt-in flag to keep responses beyond the 1h TTL (write to Vercel Blob, S3, or a Postgres adapter)

### TypeScript SDK (`packages/sdk-typescript/`)

- [ ] **`@formloop/sdk` npm package**: `createForm`, `waitForResponse`, `cleanup`
- [ ] Examples for major frameworks:
  - [ ] **Vercel AI SDK** integration
  - [ ] **OpenAI Assistants** integration
  - [ ] **LangChain** integration
  - [ ] **MCP server** wrapper
  - [ ] **Claude Code skill** (the existing one, polished)

### Python SDK improvements

- [ ] **Move config to ENV**: remove hardcoded `BRIDGE_URL` and `WEBHOOK_SECRET`
- [ ] **Publish to PyPI**: `pip install formloop`
- [ ] **Pythonic API beyond CLI**: `from formloop import Form; form = Form.create(...)`

### UI / DX

- [ ] **Form previews** for spec authors: `?preview=1` query param renders the form without storing in Redis
- [ ] **Form templates** in `templates/` directory: design-shotgun, ticket-triage, prompt-tuning, code-review, weekly-1on1
- [ ] **Slack/Discord integration**: send the form link directly via webhook (similar to HumanLayer)

---

## Phase 3 — Polish & launch materials (1 week)

Everything that makes the project look pro at first glance.

- [ ] **Logo + simple identity**: a wordmark + accent color
- [ ] **Landing page** at `formloop.dev`: pitch + demo + GIF + quickstart + docs link
- [ ] **README hero**: animated GIF showing `html-pick` in action (this is the killer screenshot)
- [ ] **Documentation site**: probably Mintlify or Nextra
- [ ] **CONTRIBUTING.md**: dev setup, PR process, code style
- [ ] **CODE_OF_CONDUCT.md**: standard
- [ ] **GitHub issue templates**: bug, feature request
- [ ] **GitHub Actions CI**: lint, typecheck, tests, build
- [ ] **CHANGELOG.md**: bootstrap with current state
- [ ] **Vitest tests** for React components
- [ ] **Pytest tests** for the Python SDK

---

## Phase 4 — Launch (3-5 days)

The actual splash.

- [ ] **Twitter/X thread** (with @anthropicai, @vercel, @humanlayer_dev tagged)
- [ ] **Show HN** post (timing: Tuesday-Thursday morning, US time)
- [ ] **Outreach to 5-10 AI dev influencers** with a personalized DM
- [ ] **Blog article** (medium-format, ~1500 words) on the pattern formloop solves — could be guest-post on a popular AI dev blog
- [ ] **Reddit posts**: r/MachineLearning, r/LocalLLaMA, r/programming
- [ ] **Indie Hackers** post
- [ ] **Document the launch**: track GitHub stars, traffic, issues, mentions

---

## Phase 5 — Maintenance & iteration (ongoing)

The unsexy work that determines whether the project actually grows.

- [ ] **Respond to issues within 48h** for the first month
- [ ] **Merge community PRs** (assuming they meet the bar)
- [ ] **Weekly dev log** post for the first 4 weeks (helps with ongoing visibility)
- [ ] **Watch metrics**: stars, npm downloads, Vercel deployment count (if hosted)
- [ ] **Course-correct based on usage signals**: which question types do people use? Which integrations get installed? What gets reported as broken?
- [ ] **Talk at AI engineer meetups** when appropriate

---

## Risk register

| Risk | Mitigation |
|---|---|
| Anthropic / OpenAI ship native equivalent | Launch fast (4-6 weeks). Position as "framework-agnostic, self-hostable" — they won't compete on those axes. |
| Project gets confused with form builders (Tally, Typeform) | Pitch crystal-clear: "for LLM agents, not for humans filling out forms." |
| HumanLayer encroaches on UI | Reach out, propose integration / partnership. Their delivery + our UI = strong combo. |
| Jérôme runs out of time | Keep the OSS core minimal. Don't promise features that require ongoing work. |
| Low launch signal | Have a fallback narrative: "useful tool I built for my own workflow, sharing it." Better than overclaiming. |
