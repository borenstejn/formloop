#!/usr/bin/env node
/**
 * formloop CLI — local form engine for LLM agents.
 *
 * Usage:
 *   npx formloop                          # start HTTP server on 127.0.0.1:3847
 *   npx formloop --port 4000              # explicit port
 *   npx formloop --host 0.0.0.0           # bind to all interfaces
 *   npx formloop --mcp                    # start as MCP server (stdio)
 *   npx formloop install                  # add MCP config to Claude Code
 *   npx formloop create --spec '{...}'    # create a form, print JSON result
 *   npx formloop wait --form-id ABC       # poll until form submitted
 *   npx formloop list --form-id ABC       # list submissions (persistent forms)
 */

import { spawn, execSync } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, platform } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

const DEFAULT_PORT = 3847;
const DEFAULT_HOST = "127.0.0.1";
const MAX_PORT_TRIES = 100;

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function getSubcommand() {
  const args = process.argv.slice(2);
  const first = args[0];

  if (!first || first.startsWith("-")) return null;
  if (["install", "create", "wait", "list"].includes(first)) return first;
  return null;
}

function getFlag(name) {
  const args = process.argv.slice(2);
  return args.includes(name);
}

function getFlagValue(name) {
  const args = process.argv.slice(2);
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}

// ---------------------------------------------------------------------------
// Server start (existing logic, extracted)
// ---------------------------------------------------------------------------

function isPortAvailable(port, host) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findPort(startPort, host, explicit) {
  if (explicit) {
    const available = await isPortAvailable(startPort, host);
    if (!available) {
      console.error(`Error: port ${startPort} is already in use`);
      process.exit(1);
    }
    return startPort;
  }

  for (let p = startPort; p < startPort + MAX_PORT_TRIES; p++) {
    if (await isPortAvailable(p, host)) return p;
  }

  console.error(
    `Error: no available port found in range ${startPort}-${startPort + MAX_PORT_TRIES - 1}`
  );
  process.exit(1);
}

function ensureBuild() {
  const standaloneServer = join(
    PROJECT_ROOT,
    ".next",
    "standalone",
    "server.js"
  );
  if (existsSync(standaloneServer)) return;

  console.log("First run — building formloop server...");
  try {
    execSync("npm run build", {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
    });
  } catch {
    console.error(
      "Build failed. Run `npm run build` manually to see errors."
    );
    process.exit(1);
  }

  if (!existsSync(standaloneServer)) {
    console.error(
      "Build completed but standalone server not found. Check next.config.js has output: 'standalone'."
    );
    process.exit(1);
  }
}

async function startServer() {
  const portArg = getFlagValue("--port");
  const hostArg = getFlagValue("--host");
  const explicitPort = portArg !== null;
  const port = portArg ? parseInt(portArg, 10) : DEFAULT_PORT;
  const host = hostArg ?? DEFAULT_HOST;

  // Refuse to bind to non-loopback without WEBHOOK_SECRET — otherwise anyone
  // on the network can create/read/export forms. Loopback (127.0.0.1, ::1,
  // localhost) is always safe.
  const isLoopback =
    host === "127.0.0.1" || host === "::1" || host === "localhost";
  if (!isLoopback && !process.env.WEBHOOK_SECRET) {
    console.error(
      `\nformloop refuses to bind to ${host} without WEBHOOK_SECRET.\n` +
        `\nBinding to a non-loopback host exposes the server to your local\n` +
        `network (or the internet). Without WEBHOOK_SECRET, every API endpoint\n` +
        `is open: anyone who can reach the port can read forms, list submissions,\n` +
        `and export CSV.\n` +
        `\nFix one of:\n` +
        `  • Drop --host (default 127.0.0.1 is safe).\n` +
        `  • Set WEBHOOK_SECRET=<long-random-string> in the env.\n`,
    );
    process.exit(1);
  }

  const resolvedPort = await findPort(port, host, explicitPort);

  ensureBuild();

  const standaloneServer = join(
    PROJECT_ROOT,
    ".next",
    "standalone",
    "server.js"
  );

  console.log(`\nformloop server starting on http://${host}:${resolvedPort}\n`);

  const child = spawn("node", [standaloneServer], {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      // Opt out of Next.js anonymous telemetry by default. Users who want it
      // can re-enable with NEXT_TELEMETRY_DISABLED=0.
      NEXT_TELEMETRY_DISABLED:
        process.env.NEXT_TELEMETRY_DISABLED ?? "1",
      PORT: String(resolvedPort),
      HOSTNAME: host,
    },
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

// ---------------------------------------------------------------------------
// install subcommand
// ---------------------------------------------------------------------------

function cmdInstall() {
  const home = homedir();
  const claudeSettingsPath = join(home, ".claude", "settings.json");

  const mcpEntry = {
    command: "npx",
    args: ["-y", "formloop", "--mcp"],
    env: {},
  };

  // Try Claude Code settings
  let settings = {};
  if (existsSync(claudeSettingsPath)) {
    try {
      settings = JSON.parse(readFileSync(claudeSettingsPath, "utf-8"));
    } catch {
      settings = {};
    }
  }

  if (!settings.mcpServers) {
    settings.mcpServers = {};
  }

  const alreadyInstalled =
    settings.mcpServers.formloop &&
    JSON.stringify(settings.mcpServers.formloop) === JSON.stringify(mcpEntry);

  if (alreadyInstalled) {
    console.log("formloop MCP server is already configured in Claude Code.");
    console.log(`Config: ${claudeSettingsPath}`);
    return;
  }

  settings.mcpServers.formloop = mcpEntry;

  // Ensure directory exists
  const claudeDir = join(home, ".claude");
  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2) + "\n");

  console.log("formloop MCP server installed for Claude Code.");
  console.log(`Config written to: ${claudeSettingsPath}`);
  console.log("");
  console.log("Restart Claude Code to activate. The MCP server will");
  console.log("auto-start a local formloop HTTP server when needed.");
  console.log("");
  console.log("For Cursor, add this to your MCP settings:");
  console.log("");
  console.log(
    JSON.stringify({ formloop: mcpEntry }, null, 2)
  );
}

// ---------------------------------------------------------------------------
// create subcommand
// ---------------------------------------------------------------------------

async function ensureServerRunning() {
  const port = parseInt(
    getFlagValue("--port") || process.env.FORMLOOP_PORT || String(DEFAULT_PORT),
    10
  );
  const host = getFlagValue("--host") || process.env.FORMLOOP_HOST || DEFAULT_HOST;
  const baseUrl = `http://${host}:${port}`;

  // Check if already running
  const inUse = !(await isPortAvailable(port, host));
  if (inUse) return baseUrl;

  // Auto-start
  console.error("formloop: starting local server...");
  ensureBuild();

  const standaloneServer = join(
    PROJECT_ROOT,
    ".next",
    "standalone",
    "server.js"
  );
  const child = spawn("node", [standaloneServer], {
    cwd: PROJECT_ROOT,
    stdio: "ignore",
    detached: true,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED:
        process.env.NEXT_TELEMETRY_DISABLED ?? "1",
      PORT: String(port),
      HOSTNAME: host,
    },
  });
  child.unref();

  // Wait for readiness
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const inUse = !(await isPortAvailable(port, host));
    if (inUse) {
      await new Promise((r) => setTimeout(r, 500));
      return baseUrl;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.error("Error: server failed to start within 30s");
  process.exit(1);
}

async function cmdCreate() {
  const specJson = getFlagValue("--spec");
  if (!specJson) {
    console.error("Usage: formloop create --spec '<JSON>'");
    process.exit(1);
  }

  let spec;
  try {
    spec = JSON.parse(specJson);
  } catch {
    console.error("Error: --spec must be valid JSON");
    process.exit(1);
  }

  const baseUrl = await ensureServerRunning();

  try {
    const res = await fetch(`${baseUrl}/api/forms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spec }),
    });
    const data = await res.json();

    if (!res.ok) {
      console.error(JSON.stringify({ error: data.error || `HTTP ${res.status}` }));
      process.exit(1);
    }

    console.log(JSON.stringify(data, null, 2));

    // Open in browser by default
    if (data.form_url && !getFlag("--no-open")) {
      try {
        const cmd =
          platform() === "darwin"
            ? "open"
            : platform() === "win32"
              ? "start"
              : "xdg-open";
        spawn(cmd, [data.form_url], {
          detached: true,
          stdio: "ignore",
        }).unref();
      } catch {
        // Non-fatal
      }
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        error: `request failed: ${err.message}`,
      })
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// wait subcommand
// ---------------------------------------------------------------------------

async function cmdWait() {
  const formId = getFlagValue("--form-id");
  if (!formId) {
    console.error("Usage: formloop wait --form-id <ID> [--timeout 1800]");
    process.exit(1);
  }

  const timeout = parseInt(getFlagValue("--timeout") || "1800", 10);
  const pollInterval = parseInt(getFlagValue("--poll") || "3", 10) * 1000;
  const baseUrl = await ensureServerRunning();
  const deadline = Date.now() + timeout * 1000;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(
        `${baseUrl}/api/response/${formId}?consume=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === "ready") {
          console.log(
            JSON.stringify(
              {
                form_id: formId,
                answers: data.answers,
                submitted_at: data.submittedAt,
              },
              null,
              2
            )
          );
          return;
        }
      }
    } catch {
      // Network error — retry
    }

    await new Promise((r) => setTimeout(r, pollInterval));
  }

  console.error(JSON.stringify({ error: "timeout", form_id: formId }));
  process.exit(2);
}

// ---------------------------------------------------------------------------
// list subcommand
// ---------------------------------------------------------------------------

async function cmdList() {
  const formId = getFlagValue("--form-id");
  if (!formId) {
    console.error("Usage: formloop list --form-id <ID>");
    process.exit(1);
  }

  const baseUrl = await ensureServerRunning();

  try {
    const res = await fetch(
      `${baseUrl}/api/forms/${formId}/submissions`
    );
    const data = await res.json();

    if (!res.ok) {
      console.error(
        JSON.stringify({ error: data.error || `HTTP ${res.status}` })
      );
      process.exit(1);
    }

    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(
      JSON.stringify({ error: `request failed: ${err.message}` })
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// --mcp flag
// ---------------------------------------------------------------------------

async function startMcp() {
  // Import and run the MCP server
  const mcpPath = join(__dirname, "mcp-server.mjs");
  await import(mcpPath);
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function showHelp() {
  console.log(`
formloop — local form engine for LLM agents

Usage:
  formloop [options]              Start the HTTP server
  formloop --mcp                  Start as MCP server (stdio transport)
  formloop install                Add MCP config to Claude Code / Cursor
  formloop create --spec '{...}'  Create a form, print result JSON
  formloop wait --form-id <ID>    Poll until form is submitted
  formloop list --form-id <ID>    List submissions (persistent forms)

Server options:
  --port <number>   Port to listen on (default: ${DEFAULT_PORT}, auto-increments if taken)
  --host <address>  Host to bind to (default: ${DEFAULT_HOST})

Create options:
  --spec <json>     Form spec as JSON string (required)
  --no-open         Don't auto-open the form URL in browser

Wait options:
  --form-id <id>    Form ID to poll (required)
  --timeout <sec>   Max wait time in seconds (default: 1800)
  --poll <sec>      Poll interval in seconds (default: 3)

List options:
  --form-id <id>    Form ID to list submissions for (required)

Environment:
  No environment variables needed for local mode.
  Set KV_REST_API_URL + KV_REST_API_TOKEN for Upstash Redis (hosted mode).
  Set WEBHOOK_SECRET to require API auth.
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (getFlag("--help") || getFlag("-h")) {
    showHelp();
    process.exit(0);
  }

  if (getFlag("--mcp")) {
    await startMcp();
    return;
  }

  const subcmd = getSubcommand();

  switch (subcmd) {
    case "install":
      cmdInstall();
      break;
    case "create":
      await cmdCreate();
      break;
    case "wait":
      await cmdWait();
      break;
    case "list":
      await cmdList();
      break;
    default:
      await startServer();
      break;
  }
}

main();
