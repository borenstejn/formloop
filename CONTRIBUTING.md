# Contributing to formloop

Contributions welcome — bug reports, feature ideas, PRs.

## Quick start (local dev)

```bash
git clone https://github.com/borenstejn/formloop.git
cd formloop/apps/server
npm install
npm run dev     # http://localhost:3000 (dev mode with hot reload)
```

No environment variables needed for local development. The server uses in-memory storage by default.

## Running the built server

```bash
cd apps/server
npm run build
npx formloop    # http://127.0.0.1:3847 (production-like standalone)
```

## Testing the MCP server

```bash
npx formloop install    # writes MCP config to ~/.claude/settings.json
# Restart Claude Code — formloop tools should appear
```

## End-to-end test

```bash
cd apps/server
bash test-e2e.sh
```

## Project layout

```
formloop/
  apps/server/          Next.js app (form engine + API + MCP server)
    bin/formloop.mjs    CLI entrypoint
    bin/mcp-server.mjs  MCP server (stdio)
    app/                Next.js App Router pages + API routes
    lib/                Shared utilities (store, auth, types, etc.)
  packages/sdk-python/  Python SDK (ask_form.py)
```

See [`CLAUDE.md`](./CLAUDE.md) for the full architectural context.

## Reporting bugs

Open an issue with:
- What you tried (commands, spec JSON if relevant)
- What you expected to happen
- What actually happened (logs, screenshots)

## Pull requests

1. Fork the repo
2. Create a topic branch
3. Make your change with a clear commit message ("what + why")
4. Run `bash test-e2e.sh` if your change touches the form engine
5. Open a PR; describe what changed and why

## Code style

- TypeScript: `strict: true`, prefer discriminated unions, no `any`
- React: server components by default; `"use client"` only where needed
- Python: stdlib-first, minimal external deps
- Commits: imperative mood, describe "why" not just "what"

## Code of Conduct

Be kind. Disagreements are fine; personal attacks aren't.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
