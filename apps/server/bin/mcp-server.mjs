#!/usr/bin/env node
/**
 * formloop MCP server — expose form tools to LLM agents via stdio transport.
 *
 * Tools:
 *   create_form         — create a form from a JSON spec
 *   wait_for_response   — poll until an ephemeral form is submitted
 *   list_submissions    — list all submissions for a persistent form
 *
 * The server auto-starts a local formloop HTTP server on port 3847 if one
 * isn't already running.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn, execSync } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

const DEFAULT_PORT = 3847;
const DEFAULT_HOST = "127.0.0.1";

// ---------------------------------------------------------------------------
// HTTP server management
// ---------------------------------------------------------------------------

function isPortInUse(port, host = DEFAULT_HOST) {
  return new Promise((resolve) => {
    const srv = createNetServer();
    srv.once("error", () => resolve(true));
    srv.once("listening", () => {
      srv.close(() => resolve(false));
    });
    srv.listen(port, host);
  });
}

async function ensureHttpServer() {
  const port = parseInt(process.env.FORMLOOP_PORT || String(DEFAULT_PORT), 10);
  const host = process.env.FORMLOOP_HOST || DEFAULT_HOST;
  const baseUrl = `http://${host}:${port}`;

  // Already running?
  if (await isPortInUse(port, host)) {
    return baseUrl;
  }

  // Need to build first?
  const standaloneServer = join(PROJECT_ROOT, ".next", "standalone", "server.js");
  if (!existsSync(standaloneServer)) {
    process.stderr.write("formloop: building server (first run)...\n");
    try {
      execSync("npm run build", { cwd: PROJECT_ROOT, stdio: "pipe" });
    } catch {
      throw new Error("Build failed. Run `npm run build` in the formloop directory.");
    }
  }

  // Spawn in background
  const child = spawn("node", [standaloneServer], {
    cwd: PROJECT_ROOT,
    stdio: "ignore",
    detached: true,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: host,
    },
  });
  child.unref();

  // Wait for server to be ready (up to 30s)
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await isPortInUse(port, host)) {
      // Small extra wait for HTTP handler readiness
      await new Promise((r) => setTimeout(r, 500));
      return baseUrl;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error(`formloop HTTP server failed to start on ${baseUrl}`);
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function httpPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function httpGet(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok && res.status !== 404) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return { status: res.status, data };
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "create_form",
    description:
      "Create a formloop form from a JSON spec. Returns the form URL for the user to fill. " +
      "The spec must include a `title` (string) and `blocks` (array of question objects). " +
      "Question kinds: mc (multiple choice), multi (checkboxes), text, textarea, yn (yes/no), " +
      "number, scale (1-N), html-pick (clickable HTML cards), rank (drag-and-drop ordering), " +
      "scale-preview (slider with live HTML preview), html (context-only, no answer). " +
      "Each question block needs `kind`, `id`, and `title`. Options are required for mc, multi, html-pick, rank.",
    inputSchema: {
      type: "object",
      properties: {
        spec: {
          type: "object",
          description: "The form spec object with `title` and `blocks` array",
          properties: {
            title: { type: "string", description: "Form title shown to the user" },
            description: { type: "string", description: "Optional subtitle" },
            blocks: {
              type: "array",
              description: "Array of question/content blocks",
              items: { type: "object" },
            },
            persistent: {
              type: "boolean",
              description: "If true, allow multiple submissions (default: false, single-response ephemeral)",
            },
            layout: {
              type: "string",
              enum: ["stack", "split"],
              description: "Layout style: stack (default) or split (two-column)",
            },
          },
          required: ["title", "blocks"],
        },
        open_in_browser: {
          type: "boolean",
          description: "Open the form URL in the user's browser (default: true)",
        },
      },
      required: ["spec"],
    },
  },
  {
    name: "wait_for_response",
    description:
      "Poll until an ephemeral form is submitted, then return the answers. " +
      "Use after create_form to wait for the user to fill the form. " +
      "Returns the structured answers keyed by question label.",
    inputSchema: {
      type: "object",
      properties: {
        form_id: {
          type: "string",
          description: "The form_id returned by create_form",
        },
        timeout_seconds: {
          type: "number",
          description: "Max seconds to wait (default: 1800 = 30 min)",
        },
      },
      required: ["form_id"],
    },
  },
  {
    name: "list_submissions",
    description:
      "List all submissions for a persistent form. " +
      "Only works with forms created with persistent: true.",
    inputSchema: {
      type: "object",
      properties: {
        form_id: {
          type: "string",
          description: "The form_id of the persistent form",
        },
      },
      required: ["form_id"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

async function handleCreateForm(args) {
  const baseUrl = await ensureHttpServer();
  const { spec, open_in_browser = true } = args;

  const result = await httpPost(`${baseUrl}/api/forms`, { spec });

  // Open in browser if requested
  if (open_in_browser && result.form_url) {
    try {
      const { platform } = await import("node:os");
      const os = platform();
      const cmd = os === "darwin" ? "open" : os === "win32" ? "start" : "xdg-open";
      spawn(cmd, [result.form_url], { detached: true, stdio: "ignore" }).unref();
    } catch {
      // Non-fatal — user can open the URL manually
    }
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

async function handleWaitForResponse(args) {
  const baseUrl = await ensureHttpServer();
  const { form_id, timeout_seconds = 1800 } = args;
  const deadline = Date.now() + timeout_seconds * 1000;
  const pollInterval = 3000; // 3s

  while (Date.now() < deadline) {
    const { status, data } = await httpGet(
      `${baseUrl}/api/response/${form_id}?consume=1`
    );

    if (status === 200 && data.status === "ready") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                form_id,
                answers: data.answers,
                submitted_at: data.submittedAt,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    await new Promise((r) => setTimeout(r, pollInterval));
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ error: "timeout", form_id }),
      },
    ],
    isError: true,
  };
}

async function handleListSubmissions(args) {
  const baseUrl = await ensureHttpServer();
  const { form_id } = args;

  const { status, data } = await httpGet(
    `${baseUrl}/api/forms/${form_id}/submissions`
  );

  if (status === 404) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "form not found", form_id }),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// MCP server setup
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: "formloop",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "create_form":
        return await handleCreateForm(args);
      case "wait_for_response":
        return await handleWaitForResponse(args);
      case "list_submissions":
        return await handleListSubmissions(args);
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("formloop MCP server running (stdio)\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
