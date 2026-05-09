# Contributing to formloop

Contributions welcome — bug reports, feature ideas, PRs.

## Quick start (local dev)

```bash
git clone https://github.com/borenstejn/formloop.git
cd formloop

# Server
cd apps/server
npm install
cp .env.example .env.local   # fill in WEBHOOK_SECRET, KV_REST_API_URL, KV_REST_API_TOKEN
npm run dev

# Python SDK
cd ../../packages/sdk-python
python ask_form.py --help
```

## Project layout

See [`CLAUDE.md`](./CLAUDE.md) for the full architectural context — it's written for AI assistants but works just as well for humans onboarding to the codebase.

## Reporting bugs

Open an issue with:
- What you tried (commands, spec JSON if relevant)
- What you expected to happen
- What actually happened (logs, screenshots)

## Suggesting features

Open an issue tagged `feature-request`. The simpler the proposal, the more likely it ships.

## Pull requests

1. Fork the repo
2. Create a topic branch
3. Make your change with a clear commit message ("what + why")
4. Run tests if relevant (TODO: setup tests)
5. Open a PR; describe what changed and why

## Code style

- TypeScript: `strict: true`, prefer discriminated unions, no `any`
- React: server components by default; `"use client"` only where needed
- Python: stdlib-first, minimal external deps
- Commits: imperative mood, no emoji, mention "why" not just "what"

## Code of Conduct

Be kind. Disagreements are fine; personal attacks aren't. If you wouldn't say it to a colleague at work, don't say it here.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
