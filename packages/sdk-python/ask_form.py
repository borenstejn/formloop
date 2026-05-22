#!/usr/bin/env python3
"""
ask_form — Generate a form on-the-fly for structured human input during an
LLM agent session, then retrieve answers.

Server resolution order:
  1. FORMLOOP_URL          — explicit override (any URL)
  2. FORMLOOP_LOCAL_URL    — local server auto-detect (default http://127.0.0.1:3847)
  3. Auto-start            — launch `npx formloop` if nothing is running locally
  4. FORMLOOP_HOSTED_URL   — fallback to a hosted instance

Usage:
  python3 ask_form.py create --spec '<JSON>'
  python3 ask_form.py wait --form-id ABC [--timeout 1800] [--poll 5]
  python3 ask_form.py list-submissions --form-id ABC
  python3 ask_form.py export-csv --form-id ABC [--output path.csv]
  python3 ask_form.py wait-n --form-id ABC --n 10 [--timeout 1800] [--poll 10]

Environment:
  FORMLOOP_URL          Override — use this server, skip auto-detect
  FORMLOOP_LOCAL_URL    Local server URL (default: http://127.0.0.1:3847)
  FORMLOOP_HOSTED_URL   Fallback hosted server (requires FORMLOOP_SECRET)
  FORMLOOP_SECRET       API secret (header auth, hosted mode only)
"""

import argparse
import json
import os
import socket
import subprocess
import sys
import time
import urllib.request
import urllib.error

DEFAULT_LOCAL_URL = "http://127.0.0.1:3847"


def _get_secret():
    return os.environ.get("FORMLOOP_SECRET", "")


def _make_headers(extra=None):
    headers = {"User-Agent": "formloop-sdk-py/1.0"}
    secret = _get_secret()
    if secret:
        headers["X-Webhook-Secret"] = secret
    if extra:
        headers.update(extra)
    return headers


def _is_server_running(url):
    """Check if a formloop server is running at the given URL."""
    # Quick TCP probe first
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 80
        sock = socket.create_connection((host, port), timeout=2)
        sock.close()
    except (OSError, socket.error):
        return False

    # HTTP check — look for a valid response
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "formloop-sdk-py/1.0"})
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status == 200
    except Exception:
        return False


def _auto_start_local():
    """Launch `npx formloop` in the background and wait for it to be ready."""
    local_url = os.environ.get("FORMLOOP_LOCAL_URL", DEFAULT_LOCAL_URL)

    print(
        json.dumps({"info": "starting local formloop server", "url": local_url}),
        file=sys.stderr,
    )

    # Launch in background — survives this process
    proc = subprocess.Popen(
        ["npx", "formloop", "--port", str(_extract_port(local_url))],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )

    # Wait up to 60s for server to be ready (first run may need to build)
    deadline = time.time() + 60
    while time.time() < deadline:
        if _is_server_running(local_url):
            print(
                json.dumps({"info": "local server ready", "url": local_url, "pid": proc.pid}),
                file=sys.stderr,
            )
            return local_url
        time.sleep(1)

    print(
        json.dumps({"error": "local server failed to start within 60s"}),
        file=sys.stderr,
    )
    proc.terminate()
    return None


def _extract_port(url):
    """Extract port number from URL."""
    from urllib.parse import urlparse
    parsed = urlparse(url)
    return parsed.port or 3847


def _resolve_server():
    """Resolve which formloop server to use."""
    # 1. Explicit override
    explicit = os.environ.get("FORMLOOP_URL")
    if explicit:
        return explicit.rstrip("/")

    # 2. Local server already running
    local_url = os.environ.get("FORMLOOP_LOCAL_URL", DEFAULT_LOCAL_URL)
    if _is_server_running(local_url):
        return local_url.rstrip("/")

    # 3. Auto-start local server
    started = _auto_start_local()
    if started:
        return started.rstrip("/")

    # 4. Hosted fallback
    hosted = os.environ.get("FORMLOOP_HOSTED_URL")
    if hosted:
        return hosted.rstrip("/")

    print(
        json.dumps({
            "error": "no formloop server found",
            "hint": "set FORMLOOP_URL, start a local server with `npx formloop`, or set FORMLOOP_HOSTED_URL",
        })
    )
    sys.exit(1)


def _get_json(url):
    req = urllib.request.Request(url, headers=_make_headers())
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))


def cmd_create(args):
    """Create a form on the formloop engine."""
    server = _resolve_server()
    spec = json.loads(args.spec)
    if "blocks" not in spec or not isinstance(spec["blocks"], list):
        print(json.dumps({"error": "spec.blocks must be a non-empty list"}))
        sys.exit(1)

    payload = {"spec": spec}
    req = urllib.request.Request(
        f"{server}/api/forms",
        method="POST",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers=_make_headers({"Content-Type": "application/json"}),
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(json.dumps({"error": "form creation failed", "code": e.code, "body": body}))
        sys.exit(1)

    print(json.dumps(data, ensure_ascii=False))


def cmd_wait(args):
    """Poll until the form is submitted (ephemeral mode)."""
    server = _resolve_server()
    deadline = time.time() + args.timeout
    url = f"{server}/api/response/{args.form_id}?consume=1"
    headers = _make_headers()

    while time.time() < deadline:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read().decode("utf-8"))
                if data.get("status") == "ready":
                    print(
                        json.dumps(
                            {
                                "form_id": args.form_id,
                                "answers": data.get("answers", {}),
                                "submitted_at": data.get("submittedAt"),
                            },
                            ensure_ascii=False,
                        )
                    )
                    return
        except urllib.error.HTTPError as e:
            if e.code != 404:
                print(json.dumps({"error": f"poll failed: {e.code}"}))
                sys.exit(1)
        except urllib.error.URLError as e:
            print(json.dumps({"error": f"network error: {e}"}), file=sys.stderr)
        time.sleep(args.poll)

    print(json.dumps({"error": "timeout", "form_id": args.form_id}))
    sys.exit(2)


def cmd_list_submissions(args):
    """List all submissions of a persistent form."""
    server = _resolve_server()
    url = f"{server}/api/forms/{args.form_id}/submissions"
    try:
        data = _get_json(url)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(json.dumps({"error": "list failed", "code": e.code, "body": body}))
        sys.exit(1)
    print(json.dumps(data, ensure_ascii=False))


def cmd_export_csv(args):
    """Download a CSV of all submissions for a persistent form."""
    server = _resolve_server()
    url = f"{server}/api/forms/{args.form_id}/export.csv"
    try:
        req = urllib.request.Request(url, headers=_make_headers())
        with urllib.request.urlopen(req, timeout=30) as r:
            csv_bytes = r.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(json.dumps({"error": "export failed", "code": e.code, "body": body}))
        sys.exit(1)
    if args.output:
        with open(args.output, "wb") as f:
            f.write(csv_bytes)
        print(json.dumps({"saved": args.output, "bytes": len(csv_bytes)}))
    else:
        sys.stdout.write(csv_bytes.decode("utf-8"))


def cmd_wait_n(args):
    """Poll a persistent form until at least N submissions have arrived."""
    server = _resolve_server()
    deadline = time.time() + args.timeout
    url = f"{server}/api/forms/{args.form_id}/submissions"

    while time.time() < deadline:
        try:
            data = _get_json(url)
            count = data.get("count", 0)
            if count >= args.n:
                print(json.dumps(data, ensure_ascii=False))
                return
            print(
                json.dumps({"waiting": True, "count": count, "target": args.n}),
                file=sys.stderr,
            )
        except urllib.error.HTTPError as e:
            if e.code == 404:
                print(json.dumps({"error": "form not found", "form_id": args.form_id}))
                sys.exit(1)
            body = e.read().decode("utf-8", errors="replace")
            print(json.dumps({"error": f"poll {e.code}", "body": body}), file=sys.stderr)
        except urllib.error.URLError as e:
            print(json.dumps({"error": f"network: {e}"}), file=sys.stderr)
        time.sleep(args.poll)

    print(json.dumps({"error": "timeout", "form_id": args.form_id}))
    sys.exit(2)


def main():
    p = argparse.ArgumentParser(
        description="formloop SDK — generate forms for structured human input"
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("create", help="Create a form on the formloop engine")
    c.add_argument("--spec", required=True, help="JSON spec for the form")
    c.set_defaults(func=cmd_create)

    w = sub.add_parser("wait", help="Poll until the form is submitted (ephemeral)")
    w.add_argument("--form-id", required=True)
    w.add_argument("--timeout", type=int, default=1800, help="seconds (default 1800 = 30 min)")
    w.add_argument("--poll", type=int, default=5, help="poll interval seconds")
    w.set_defaults(func=cmd_wait)

    ls = sub.add_parser(
        "list-submissions",
        help="List all submissions of a persistent form (JSON)",
    )
    ls.add_argument("--form-id", required=True)
    ls.set_defaults(func=cmd_list_submissions)

    ex = sub.add_parser(
        "export-csv",
        help="Download a CSV of all submissions for a persistent form",
    )
    ex.add_argument("--form-id", required=True)
    ex.add_argument("--output", help="Write to file (default: stdout)")
    ex.set_defaults(func=cmd_export_csv)

    wn = sub.add_parser(
        "wait-n",
        help="Poll a persistent form until at least N submissions have landed",
    )
    wn.add_argument("--form-id", required=True)
    wn.add_argument("--n", type=int, required=True, help="target submission count")
    wn.add_argument("--timeout", type=int, default=1800, help="seconds (default 1800)")
    wn.add_argument("--poll", type=int, default=10, help="poll interval seconds")
    wn.set_defaults(func=cmd_wait_n)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
