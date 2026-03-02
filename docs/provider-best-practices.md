# Provider Best Practices Used by ai-flow

## OpenAI / Codex

- Keep coding prompts concise.
- Avoid unnecessary preambles.
- Prefer the OpenAI docs MCP for OpenAI product setup questions.
- Restrict tool access in agentic workflows where possible.

## Anthropic / Claude Code

- Persist repeated instructions in `CLAUDE.md`.
- Use hooks to improve passive lifecycle automation.
- Prefer focused subagents over a single catch-all subagent.
- Limit subagent tool access to the tools each subagent actually needs.
