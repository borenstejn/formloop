# `@formloop/sdk` — TypeScript SDK

TypeScript/JavaScript driver for the formloop server.

## Status

⚪ **Not started.** Planned for Phase 2 of the roadmap.

## Planned API

```typescript
import { Formloop } from "@formloop/sdk";

const formloop = new Formloop({
  baseUrl: process.env.FORMLOOP_URL,
  secret: process.env.FORMLOOP_SECRET,
});

// Create a form
const { formId, formUrl } = await formloop.createForm({
  title: "My question",
  blocks: [
    { kind: "mc", id: "q1", title: "Pick one", options: ["A", "B"] },
    { kind: "textarea", id: "q2", title: "Why?" },
  ],
});

// Wait for submission (polls under the hood)
const { answers } = await formloop.waitForResponse(formId, { timeoutMs: 1_800_000 });

console.log(answers); // { "Pick one": "A", "Why?": "..." }
```

## Planned integrations

- Vercel AI SDK
- OpenAI Assistants
- LangChain (JS)
- MCP server wrapper
- Claude Code skill
