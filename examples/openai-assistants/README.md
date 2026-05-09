# OpenAI Assistants integration

⚪ **Not started.** Planned for Phase 2.

The plan: register a `request_human_input` tool with the assistant. When the assistant calls it, our wrapper creates a formloop form, returns the URL, and waits for the response before returning the answer to the assistant.

```typescript
// Sketch
const formloopTool = {
  type: "function",
  function: {
    name: "request_human_input",
    description: "Ask the human a complex structured question via a generated form. Returns structured answers when submitted.",
    parameters: {
      type: "object",
      properties: {
        spec: { type: "object", description: "formloop form spec" },
      },
      required: ["spec"],
    },
  },
};
```
