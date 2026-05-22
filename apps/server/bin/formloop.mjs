#!/usr/bin/env node
/**
 * formloop CLI — start a local formloop server.
 *
 * Usage:
 *   npx formloop                    # starts on 127.0.0.1:3847
 *   npx formloop --port 4000        # explicit port
 *   npx formloop --host 0.0.0.0     # bind to all interfaces (advanced)
 */

import { spawn, execSync } from "node:child_process";
import { createServer } from "node:net";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

const DEFAULT_PORT = 3847;
const DEFAULT_HOST = "127.0.0.1";
const MAX_PORT_TRIES = 100;

function parseArgs() {
  const args = process.argv.slice(2);
  let port = null;
  let host = DEFAULT_HOST;
  let explicitPort = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
      explicitPort = true;
      i++;
    } else if (args[i] === "--host" && args[i + 1]) {
      host = args[i + 1];
      i++;
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`
formloop — local form engine for LLM agents

Usage:
  formloop [options]

Options:
  --port <number>   Port to listen on (default: ${DEFAULT_PORT}, auto-increments if taken)
  --host <address>  Host to bind to (default: ${DEFAULT_HOST})
  -h, --help        Show this help

Environment:
  No environment variables needed for local mode.
  Set KV_REST_API_URL + KV_REST_API_TOKEN for Upstash Redis (hosted mode).
  Set WEBHOOK_SECRET to require API auth.
`);
      process.exit(0);
    }
  }

  return { port: port ?? DEFAULT_PORT, host, explicitPort };
}

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

  console.error(`Error: no available port found in range ${startPort}-${startPort + MAX_PORT_TRIES - 1}`);
  process.exit(1);
}

function ensureBuild() {
  const standaloneServer = join(PROJECT_ROOT, ".next", "standalone", "server.js");
  if (existsSync(standaloneServer)) return;

  console.log("First run — building formloop server...");
  try {
    execSync("npm run build", {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
    });
  } catch {
    console.error("Build failed. Run `npm run build` manually to see errors.");
    process.exit(1);
  }

  if (!existsSync(standaloneServer)) {
    console.error("Build completed but standalone server not found. Check next.config.js has output: 'standalone'.");
    process.exit(1);
  }
}

async function main() {
  const { port, host, explicitPort } = parseArgs();
  const resolvedPort = await findPort(port, host, explicitPort);

  ensureBuild();

  const standaloneServer = join(PROJECT_ROOT, ".next", "standalone", "server.js");

  console.log(`\nformloop server starting on http://${host}:${resolvedPort}\n`);

  const child = spawn("node", [standaloneServer], {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: String(resolvedPort),
      HOSTNAME: host,
    },
  });

  // Forward signals
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main();
