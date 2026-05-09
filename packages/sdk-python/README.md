# `formloop` Python SDK

Python driver for the formloop server. Lets an LLM agent (or any Python code) create a custom form, wait for the human to submit, and resume with structured answers.

## Status

🟡 **Pre-release.** The current `ask_form.py` works but has hardcoded server URL and secret. The full PyPI package (`pip install formloop`) is in [Phase 2 of the roadmap](../../ROADMAP.md).

## Current usage

```bash
# Create a form
python ask_form.py create-custom --spec '{
  "title": "My question",
  "blocks": [
    {"kind": "mc", "id": "q1", "title": "Pick one", "options": ["A", "B"]},
    {"kind": "textarea", "id": "q2", "title": "Why?"}
  ]
}'
# → {"form_id": "abc123", "form_url": "https://.../forms/abc123", "expires_in_seconds": 86400}

# Send the form_url to the human (email, Slack, etc.)

# Wait for them to submit
python ask_form.py wait --form-id abc123 --timeout 1800
# → {"form_id": "abc123", "answers": {"Pick one": "A", "Why?": "..."}, "submitted_at": "..."}
```

## See also

- [Question type reference](../../docs/question-types.md) — TODO
- [LLM integration guide](../../docs/llm-integration.md) — TODO
- [Examples for Claude Code, OpenAI, LangChain, etc.](../../examples/) — TODO
