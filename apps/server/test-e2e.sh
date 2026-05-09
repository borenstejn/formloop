#!/bin/bash
# End-to-end test: create form with all 10 types + html block,
# submit programmatically, verify retrieval.

set -euo pipefail

BRIDGE="https://tally-bridge-manibors-projects.vercel.app"
SECRET="c497ab42f6c3cf110bf1882216388ad4c114268a1577efe9494e38b6282cdd36"

SPEC='{
  "spec": {
    "title": "E2E full type coverage",
    "blocks": [
      {"kind": "html", "html": "<h2 style=\"margin:0 0 8px\">Test E2E</h2><p style=\"color:#666\">On valide les 10 types.</p>"},
      {"kind": "mc", "id": "mc1", "title": "MC question", "options": ["A", "B", "C"]},
      {"kind": "multi", "id": "multi1", "title": "Multi question", "options": ["X", "Y", "Z"]},
      {"kind": "text", "id": "text1", "title": "Text question"},
      {"kind": "textarea", "id": "textarea1", "title": "Textarea question"},
      {"kind": "yn", "id": "yn1", "title": "Yn question"},
      {"kind": "number", "id": "number1", "title": "Number question", "min": 0, "max": 100},
      {"kind": "scale", "id": "scale1", "title": "Scale question", "min": 1, "max": 10, "minLabel": "Low", "maxLabel": "High"},
      {"kind": "html-pick", "id": "pick1", "title": "Html-pick question",
       "options": [
         {"id": "p1", "label": "Mockup 1", "html": "<div style=\"padding:24px;background:#fef3c7;border-radius:8px;text-align:center\"><strong>Variant A</strong></div>"},
         {"id": "p2", "label": "Mockup 2", "html": "<div style=\"padding:24px;background:#dbeafe;border-radius:8px;text-align:center\"><strong>Variant B</strong></div>"},
         {"id": "p3", "label": "Mockup 3", "html": "<div style=\"padding:24px;background:#dcfce7;border-radius:8px;text-align:center\"><strong>Variant C</strong></div>"}
       ]},
      {"kind": "rank", "id": "rank1", "title": "Rank question",
       "options": ["First", "Second", "Third", "Fourth"]},
      {"kind": "scale-preview", "id": "sp1", "title": "Scale-preview question",
       "min": 8, "max": 64,
       "previewHtml": "<div style=\"padding:{{value}}px;background:#eef2ff;border-radius:8px;text-align:center;font-weight:500\">Padding: {{value}}px</div>"}
    ]
  }
}'

echo "=== 1. Creating form ==="
RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "$SPEC" \
  "$BRIDGE/api/forms?secret=$SECRET")
echo "$RESP"
FORM_ID=$(echo "$RESP" | python3 -c "import json,sys;print(json.load(sys.stdin)['form_id'])")
FORM_URL=$(echo "$RESP" | python3 -c "import json,sys;print(json.load(sys.stdin)['form_url'])")
echo "Form ID: $FORM_ID"
echo "Form URL: $FORM_URL"
echo ""

echo "=== 2. Verifying form page renders ==="
PAGE=$(curl -s "$FORM_URL")
if echo "$PAGE" | grep -q "E2E full type coverage"; then
  echo "  ✓ Form title rendered"
else
  echo "  ✗ Form title NOT found in page"
  exit 1
fi
echo ""

echo "=== 3. Submitting answers programmatically ==="
SUBMIT='{
  "answers": {
    "mc1": "B",
    "multi1": ["X", "Z"],
    "text1": "hello world",
    "textarea1": "line one\nline two",
    "yn1": true,
    "number1": 42,
    "scale1": 7,
    "pick1": "p2",
    "rank1": ["Second", "First", "Fourth", "Third"],
    "sp1": 24
  }
}'
SUBMIT_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "$SUBMIT" \
  "$BRIDGE/api/forms/$FORM_ID/submit")
echo "$SUBMIT_RESP"
echo ""

echo "=== 4. Retrieving via /api/response ==="
RETR=$(curl -s "$BRIDGE/api/response/$FORM_ID?secret=$SECRET&consume=1")
echo "$RETR" | python3 -m json.tool
echo ""

echo "=== 5. Verifying answer integrity ==="
RETR_FILE=$(mktemp)
echo "$RETR" > "$RETR_FILE"
python3 - "$RETR_FILE" <<'PY'
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
ans = data.get("answers", {})
expected = {
  "MC question": "B",
  "Multi question": ["X", "Z"],
  "Text question": "hello world",
  "Yn question": True,
  "Number question": 42,
  "Scale question": 7,
  "Html-pick question": "p2",
  "Rank question": ["Second", "First", "Fourth", "Third"],
  "Scale-preview question": 24,
}
fail = False
for k, v in expected.items():
  got = ans.get(k)
  if got == v:
    print(f"  ok  {k}: {got}")
  else:
    print(f"  FAIL {k}: expected {v!r}, got {got!r}")
    fail = True
ta = ans.get("Textarea question", "")
if "line one" in ta and "line two" in ta:
  print(f"  ok  Textarea question: multi-line ok")
else:
  print(f"  FAIL Textarea question: bad value: {ta!r}")
  fail = True
if fail:
  sys.exit(1)
print("\nAll 10 types verified end-to-end")
PY
rm -f "$RETR_FILE"
