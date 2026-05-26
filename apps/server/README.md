# formloop

> Let your AI agent ask humans complex questions with real UI — not chat.

When an LLM agent needs structured input from a human, chat breaks down. `formloop` generates Typeform-quality forms on-the-fly — with clickable mockups, sliders, drag-and-drop — sends a link, and returns structured answers when the human submits.

One package. Works as an **MCP server** (Claude Code, Cursor, Windsurf), a **CLI** (Codex, custom agents), or a **standalone HTTP server**.

## Install

### MCP server (Claude Code / Cursor)

```bash
npx formloop install
```

This adds formloop to your MCP settings. Restart your editor — the `create_form`, `wait_for_response`, and `list_submissions` tools are now available.

### CLI (Codex / bash agents)

```bash
# Create a form
npx formloop create --spec '{
  "title": "Pick a design",
  "blocks": [
    {"kind": "html-pick", "id": "hero", "title": "Which hero layout?",
     "options": [
       {"id": "a", "label": "Minimal", "html": "<div style=\"padding:2rem;background:#f0f0f0\"><h1>Clean</h1></div>"},
       {"id": "b", "label": "Bold",    "html": "<div style=\"padding:2rem;background:#6366f1;color:white\"><h1>Bold</h1></div>"}
     ]},
    {"kind": "rank", "id": "priorities", "title": "Rank these",
     "options": ["Speed", "Quality", "Cost"]}
  ]
}'

# Wait for the human to submit
npx formloop wait --form-id <ID>
# → { "answers": { "Which hero layout?": "a", "Rank these": ["Quality", "Speed", "Cost"] } }
```

### Standalone server

```bash
npx formloop              # starts on http://127.0.0.1:3847
npx formloop --port 4000  # explicit port
```

## How it works

```
Agent                          formloop                         Human
  │                               │                               │
  ├── create_form(spec) ─────────►│                               │
  │◄── { form_id, form_url } ────┤                               │
  │                               │                               │
  ├── (sends form_url to human) ──┼──────────────────────────────►│
  │                               │                               │
  │                               │◄── human fills form ──────────┤
  │                               │    clicks Submit              │
  │                               │                               │
  ├── wait_for_response(id) ─────►│                               │
  │◄── { answers } ──────────────┤                               │
```

The server runs locally — no cloud, no API keys, no data leaves your machine.

## Question types

| Kind | Description | Answer type |
|------|-------------|-------------|
| `mc` | Multiple choice (single select) | `string` |
| `multi` | Checkboxes (multi-select) | `string[]` |
| `text` | Short text input | `string` |
| `textarea` | Long text input | `string` |
| `yn` | Yes / No | `boolean` |
| `number` | Numeric input | `number` |
| `scale` | 1-N scale | `number` |
| `html-pick` | Clickable HTML cards (mockups, designs) | `string` or `string[]` |
| `rank` | Drag-and-drop ordering | `string[]` |
| `scale-preview` | Slider with live HTML preview | `number` |
| `html` | Rich HTML context (no answer, display-only) | — |
| `group` | Multiple questions on one slide | — |

## Form spec reference

```json
{
  "title": "Form title",
  "description": "Optional subtitle",
  "layout": "stack",
  "persistent": false,
  "blocks": [
    {
      "kind": "mc",
      "id": "q1",
      "title": "Pick one",
      "options": ["A", "B", "C"],
      "headerHtml": "<p>Optional HTML context above the question</p>"
    },
    {
      "kind": "html",
      "html": "<div>Context-only slide — no answer collected</div>"
    }
  ]
}
```

**`layout`**: `"stack"` (default, single column) or `"split"` (two-column: context left, answer right).

**`persistent`**: `false` (default) = single response, auto-deleted after retrieval. `true` = multi-response, permanent, with `list_submissions` support.

## Self-hosting

formloop runs locally with zero configuration — no Redis, no cloud services needed. Data is stored in-memory.

```bash
npx formloop
```

For production or shared deployments, set these environment variables to use Upstash Redis:

```bash
KV_REST_API_URL=https://...    # Upstash Redis REST URL
KV_REST_API_TOKEN=...          # Upstash Redis REST token
WEBHOOK_SECRET=...             # Optional API auth secret
```

## MCP tools

When running as an MCP server (`npx formloop --mcp`), three tools are exposed:

| Tool | Description |
|------|-------------|
| `create_form` | Create a form from a spec. Returns `{ form_id, form_url }`. Auto-opens in browser. |
| `wait_for_response` | Poll until an ephemeral form is submitted. Returns `{ answers }`. |
| `list_submissions` | List all submissions for a persistent form. |

## CLI reference

```
formloop [options]              Start the HTTP server
formloop --mcp                  Start as MCP server (stdio transport)
formloop install                Add MCP config to Claude Code / Cursor
formloop create --spec '{...}'  Create a form
formloop wait --form-id <ID>    Poll until form is submitted
formloop list --form-id <ID>    List submissions (persistent forms)
```

## Why formloop

| | Chat | AskUserQuestion | Tally / Typeform | **formloop** |
|---|---|---|---|---|
| Rich UI (sliders, drag-and-drop, mockups) | No | No | No | Yes |
| HTML/SVG embedded as context | No | No | No | Yes |
| Async (respond from phone) | No | No | Yes | Yes |
| Generated by code | Yes | Yes | No | Yes |
| Multi-input structured | No | Limited | Yes | Yes |
| Free, self-hostable | Yes | Yes | No | Yes |
| Local-first (no cloud) | Yes | Yes | No | Yes |

## Related projects

- [HumanLayer](https://humanlayer.dev/) — orchestration for human-in-the-loop agents (Slack/Email/Discord). Complementary.
- [Anthropic Artifacts](https://www.anthropic.com/news/artifacts) — synchronous rich UI inside Claude.ai. formloop is async, agent-driven.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
