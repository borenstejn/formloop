#!/usr/bin/env python3
"""
ask_form — Génère un formulaire à la volée pour poser des questions structurées
au user pendant une session Claude Code, et récupère les réponses via le bridge
Vercel.

Deux modes :
  - "tally"  : utilise Tally.so (formulaire externe, simple, branding Tally)
  - "custom" : utilise notre engine Typeform-clone hébergé sur le bridge Vercel
               (10 types de questions y compris html-pick, rank, scale-preview)

Le mode "custom" est plus puissant (HTML embarqué, mockups cliquables, drag-and-drop)
et plus rapide à créer (pas de roundtrip Tally API). Le mode "tally" reste utile pour
les questionnaires que le user veut filer à un tiers (Tally a meilleure UX d'envoi).

Usage:
  python3 ask_form.py create        --spec '<JSON>'      # mode tally (legacy)
  python3 ask_form.py create-custom --spec '<JSON>'      # mode custom (recommandé)
  python3 ask_form.py wait --form-id ABC [--timeout 1800] [--poll 5]
  python3 ask_form.py cleanup --form-id ABC              # tally only

Spec JSON format (custom):
  {
    "title": "Titre du formulaire",
    "blocks": [
      {"kind": "html",       "html": "<div>Bloc de contexte (mockup, intro)</div>"},
      {"kind": "mc",         "id": "q1", "title": "...", "options": ["A", "B"]},
      {"kind": "multi",      "id": "q2", "title": "...", "options": [...]},
      {"kind": "text",       "id": "q3", "title": "...", "placeholder": "..."},
      {"kind": "textarea",   "id": "q4", "title": "..."},
      {"kind": "yn",         "id": "q5", "title": "..."},
      {"kind": "number",     "id": "q6", "title": "...", "min": 0, "max": 100},
      {"kind": "scale",      "id": "q7", "title": "...", "min": 1, "max": 10,
                              "minLabel": "Banal", "maxLabel": "Genial"},
      {"kind": "html-pick",  "id": "q8", "title": "...", "multi": false,
                              "options": [{"id": "a", "html": "<div>...</div>", "label": "A"},
                                          {"id": "b", "html": "<div>...</div>", "label": "B"}]},
      {"kind": "rank",       "id": "q9", "title": "...", "options": ["X", "Y", "Z"]},
      {"kind": "scale-preview", "id": "q10", "title": "...",
                              "min": 0, "max": 100,
                              "previewHtml": "<div style='padding:{{value}}px'>Padding</div>"}
    ]
  }

Spec JSON format (tally legacy):
  {
    "title": "Titre du formulaire",
    "questions": [
      {"type": "mc",       "title": "...", "options": ["A", "B", "C"]},
      {"type": "multi",    "title": "...", "options": ["A", "B", "C"]},
      {"type": "text",     "title": "..."},
      {"type": "textarea", "title": "..."},
      {"type": "yn",       "title": "..."},
      {"type": "number",   "title": "..."}
    ]
  }
"""

import argparse
import json
import os
import sys
import time
import uuid
import urllib.request
import urllib.error

# Reuse helpers from the existing tally-forms skill
SKILLS_DIR = os.path.expanduser("~/.claude/skills")
sys.path.insert(0, os.path.join(SKILLS_DIR, "tally-forms", "scripts"))
from tally import (  # noqa: E402
    TallyAPI,
    form_title,
    mc_question,
    text_question,
    textarea_question,
    yn_question,
    number_question,
    multiselect_question,
    linear_scale_question,
    page_break,
    TOKEN as TALLY_TOKEN,
)

BRIDGE_URL = "https://tally-bridge-manibors-projects.vercel.app"
WEBHOOK_SECRET = "c497ab42f6c3cf110bf1882216388ad4c114268a1577efe9494e38b6282cdd36"


def build_blocks(questions):
    """Convert spec questions into Tally blocks, separated by page breaks."""
    blocks = []
    for i, q in enumerate(questions):
        t = q.get("type", "text")
        title = q["title"]
        if t == "mc":
            blocks += mc_question(title, q["options"])
        elif t == "multi":
            blocks += multiselect_question(title, q["options"])
        elif t == "text":
            blocks += text_question(title)
        elif t == "textarea":
            blocks += textarea_question(title)
        elif t == "scale":
            blocks += linear_scale_question(
                title,
                q.get("min", 1),
                q.get("max", 5),
                q.get("min_label", ""),
                q.get("max_label", ""),
            )
        elif t == "yn":
            blocks += yn_question(title)
        elif t == "number":
            blocks += number_question(title)
        else:
            raise ValueError(f"Unknown question type: {t}")
        # Page break between questions, but not after the last one
        if i < len(questions) - 1:
            blocks += page_break()
    return blocks


def configure_webhook(form_id):
    """Register a webhook on the form so submissions hit our Vercel bridge."""
    payload = {
        "formId": form_id,
        "url": f"{BRIDGE_URL}/api/webhook?secret={WEBHOOK_SECRET}",
        "eventTypes": ["FORM_RESPONSE"],
    }
    req = urllib.request.Request(
        "https://api.tally.so/webhooks",
        method="POST",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {TALLY_TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))


def cmd_create(args):
    spec = json.loads(args.spec)
    title = spec.get("title", "Question")
    questions = spec.get("questions", [])
    if not questions:
        print(json.dumps({"error": "spec.questions is empty"}))
        sys.exit(1)

    all_blocks = form_title(title) + build_blocks(questions)

    api = TallyAPI()
    result = api._request(
        "POST",
        "/forms",
        {
            "status": "PUBLISHED",
            "blocks": all_blocks,
            "settings": {"language": "fr"},
        },
    )
    if not result or not result.get("id"):
        print(json.dumps({"error": "form creation failed", "details": result}))
        sys.exit(1)

    form_id = result["id"]
    try:
        webhook = configure_webhook(form_id)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        api.delete_form(form_id)
        print(json.dumps({"error": "webhook setup failed", "code": e.code, "body": body}))
        sys.exit(1)

    print(
        json.dumps(
            {
                "form_id": form_id,
                "form_url": f"https://tally.so/r/{form_id}",
                "webhook_id": webhook.get("id") if isinstance(webhook, dict) else None,
            },
            ensure_ascii=False,
        )
    )


def cmd_wait(args):
    deadline = time.time() + args.timeout
    url = (
        f"{BRIDGE_URL}/api/response/{args.form_id}"
        f"?secret={WEBHOOK_SECRET}&consume=1"
    )
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=10) as r:
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


def cmd_cleanup(args):
    api = TallyAPI()
    api.delete_form(args.form_id)
    print(json.dumps({"deleted": args.form_id}))


def cmd_create_custom(args):
    """Create a form on the custom Typeform-clone engine hosted on tally-bridge."""
    spec = json.loads(args.spec)
    if "blocks" not in spec or not isinstance(spec["blocks"], list):
        print(json.dumps({"error": "spec.blocks must be a non-empty list"}))
        sys.exit(1)

    payload = {"spec": spec}
    req = urllib.request.Request(
        f"{BRIDGE_URL}/api/forms?secret={WEBHOOK_SECRET}",
        method="POST",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(json.dumps({"error": "form creation failed", "code": e.code, "body": body}))
        sys.exit(1)

    print(json.dumps(data, ensure_ascii=False))


def main():
    p = argparse.ArgumentParser(description="ask_form — Tally form bridge for Claude Code")
    sub = p.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("create", help="Create a Tally form with webhook (legacy)")
    c.add_argument("--spec", required=True, help="JSON spec for the form")
    c.set_defaults(func=cmd_create)

    cc = sub.add_parser(
        "create-custom",
        help="Create a custom form on the bridge engine (recommended)",
    )
    cc.add_argument("--spec", required=True, help="JSON spec for the form")
    cc.set_defaults(func=cmd_create_custom)

    w = sub.add_parser("wait", help="Poll until the form is submitted")
    w.add_argument("--form-id", required=True)
    w.add_argument("--timeout", type=int, default=1800, help="seconds (default 1800 = 30 min)")
    w.add_argument("--poll", type=int, default=5, help="poll interval seconds")
    w.set_defaults(func=cmd_wait)

    cl = sub.add_parser("cleanup", help="Delete the form (and its webhook)")
    cl.add_argument("--form-id", required=True)
    cl.set_defaults(func=cmd_cleanup)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
