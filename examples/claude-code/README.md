# Claude Code integration example

How to wire formloop as a Claude Code skill so Claude can ask you complex questions via a generated form during a session.

## Status

🟡 **Working version exists** at `~/.claude/skills/ask-form/` (Jérôme's local install). The polished, packaged version is in Phase 2 of the roadmap.

## Working principle

1. Claude is in a session and needs to ask the user 5+ structured questions
2. Claude calls the skill which runs `python ask_form.py create-custom --spec '{...}'`
3. Claude sends the form URL via email/Slack/Telegram
4. Claude polls (`wait --form-id ...`) and resumes with the structured answers

## TODO for the official package

- [ ] Skill definition that doesn't require pre-installed Python script
- [ ] Auto-detection of the right notification channel (Telegram, Email, …)
- [ ] Documented spec format with type hints for Claude
- [ ] Examples of common patterns (design-shotgun, ticket-triage, prompt-tuning)
