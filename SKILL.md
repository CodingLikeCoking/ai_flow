---
name: ai-flow
description: Use this skill when the user wants to install, configure, activate, operate, or extend ai-flow: a passive local-first AI workflow memory system that captures Codex, Claude Code, and Cursor activity, writes Markdown logs, mirrors them globally, and exposes the dataset through an MCP server. Trigger on requests about passive prompt logging, AI workflow memory, ai-flow setup, ai-flow MCP integration, Notion sync, launchd activation, or extending this repository.
---

# ai-flow Skill

Use this repo as the working context for ai-flow setup, operations, and maintenance.

## What This Skill Covers

- Installing and activating `ai-flow`
- Registering a project for passive capture
- Running the MCP server over `stdio` or HTTP
- Connecting Codex, Cursor, and Claude Code
- Enabling `launchd` background scanning
- Configuring Notion mirroring
- Extending the collectors, renderers, suggestions, or MCP tools
- Preparing the project for open-source release

## Default Workflow

1. Read `README.md` first for the high-level flow and command surface.
2. If the user wants local activation:
   - Run `npm install`
   - Run `npm run build`
   - Run `npm run test`
   - Run `npm link`
   - Run `ai-flow init --project <path> --project-name "<name>"`
   - Run `ai-flow doctor`
3. If the user wants passive background scanning:
   - Read `docs/launchd-setup.md`
   - Install the LaunchAgent
4. If the user wants agent integration:
   - Read `docs/codex-cursor-mcp-setup.md`
   - Run `ai-flow print codex-mcp-config` or `ai-flow print cursor-mcp-config`
   - For Claude Code, read `docs/claude-hooks.md` and run `ai-flow install claude-hooks`
5. If the user wants Notion:
   - Read `docs/notion-setup.md`
6. If the user wants release or distribution guidance:
   - Read `docs/open-source-release.md`

## Implementation Guardrails

- Keep the filesystem as the source of truth.
- Treat Notion as a mirror, not the canonical store.
- Keep `stdio` as the default MCP transport.
- Keep Cursor capture clearly labeled when it is summary-derived.
- Only auto-apply reusable rules inside `AI_FLOW_MANAGED_START` / `AI_FLOW_MANAGED_END` blocks.
- Reuse existing core modules instead of duplicating logic in the CLI and MCP layers.

## Validation

After changes, run:

```bash
npm run typecheck
npm run test
npm run build
```

If activation changed, also verify:

```bash
ai-flow doctor
ai-flow scan
ai-flow-mcp --transport stdio
```
