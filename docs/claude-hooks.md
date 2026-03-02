# Claude Hooks Setup

1. Run `ai-flow install claude-hooks`.
2. Open `~/.claude/settings.json`.
3. Confirm the `hooks` object contains:
   - `UserPromptSubmit`
   - `Stop`
   - `TaskCompleted`
   - `SessionEnd`
4. Use Claude Code normally.

These hooks improve passive task-boundary detection.
