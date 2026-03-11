# ai-flow

`ai-flow` is a passive, local-first workflow memory system for AI-assisted development.

It continuously captures work from Codex, Claude Code, and Cursor, writes normalized Markdown logs into each project, mirrors a global copy to `~/Desktop/prompt_global`, exports machine-friendly datasets for future training or analysis, and exposes the same state through an MCP server so other agents can use it directly.

This repository also includes a root [`SKILL.md`](/Users/owenwong/Desktop/Programming%20Best%20Practice/SKILL.md), so agents can load the repo itself as an installable operational skill.

## What You Get

- Passive background scanning with `launchd`
- Project-local prompt, plan, status, and timeline files
- Desktop-level global mirror for cross-project memory
- Optional Notion mirroring
- Reusable pattern and automation suggestions
- Safe managed-block auto-apply for high-confidence rule updates
- An MCP server for shared access from Codex, Cursor, Claude Code, and future clients

## Binaries

- `ai-flow`: collector, setup, and maintenance CLI
- `ai-flow-mcp`: MCP server for `ai-flow` data and operations

## Core Defaults

- The filesystem is the source of truth
- `launchd` runs `ai-flow scan`
- `stdio` is the default MCP transport
- Streamable HTTP is available for local hosting or multi-client use
- Codex and Claude Code are full-fidelity passive sources in v1
- Cursor is passive but may be summary-derived in v1

## How It Works

1. `ai-flow scan` reads local artifacts from supported AI tools.
2. The collector infers task boundaries, closure state, and reusable patterns.
3. It writes normalized Markdown into `prompt/<task-slug>/...` inside the project.
4. It updates project status and timeline files under `prompt/_project/`.
5. It mirrors the latest state to `~/Desktop/prompt_global/<project-slug>/`.
6. It optionally mirrors records into Notion.
7. `ai-flow-mcp` exposes the same data through MCP tools and resources.

The generated `prompt/` directory is runtime data. In this repo it is ignored by git by default so local transcripts do not get committed accidentally.

## Project Layout

```text
src/bin/                     CLI entrypoints
src/core/                    Shared collector, analysis, rendering, sync, and action logic
src/mcp/                     MCP server registration and tool handlers
src/http/                    Streamable HTTP wrapper for MCP
docs/                        Operator docs and release notes
examples/                    launchd and managed-block examples
tests/                       Unit and integration coverage
evals/                       MCP evaluation prompts
SKILL.md                     Repo-level skill entrypoint for agents
```

## Quick Start

### 1. Install dependencies

```bash
npm install
npm run build
npm run test
```

### 2. Install the local commands

```bash
npm link
```

This makes `ai-flow` and `ai-flow-mcp` available in your shell.

### 3. Register a project

```bash
ai-flow init --project /path/to/project --project-name "My Project"
```

This creates the local `prompt/` structure, a Desktop mirror scaffold, and the project registry entry under `~/.ai-flow/projects/`.

### 4. Validate the setup

```bash
ai-flow doctor
ai-flow scan
```

## Activate Passive Background Mode

To run the collector every 60 seconds in the background:

1. Follow [`docs/launchd-setup.md`](/Users/owenwong/Desktop/Programming%20Best%20Practice/docs/launchd-setup.md).
2. Load the LaunchAgent.
3. Confirm the job is active with `launchctl list | rg ai-flow`.

After that, `ai-flow` runs passively and does not require a per-prompt command in the normal workflow.

## Connect AI Clients

### Codex and Cursor

Use [`docs/codex-cursor-mcp-setup.md`](/Users/owenwong/Desktop/Programming%20Best%20Practice/docs/codex-cursor-mcp-setup.md), or print ready-to-paste configs:

```bash
ai-flow print codex-mcp-config
ai-flow print cursor-mcp-config
```

### Claude Code

Use [`docs/claude-hooks.md`](/Users/owenwong/Desktop/Programming%20Best%20Practice/docs/claude-hooks.md), then install hooks:

```bash
ai-flow install claude-hooks
```

For Claude Code MCP in this repository, the project also ships a root [`.mcp.json`](/Users/owenwong/Desktop/Programming%20Best%20Practice/.mcp.json) entry for `aiFlow`.

## Apply The Shared Workflow Globally

To make this repo the source of truth for your machine-wide agent workflow:

```bash
./scripts/install-global-agent-workflow.sh
```

That installer links:

- `~/.codex/instructions.md` to this repo's [`AGENTS.md`](/Users/owenwong/Desktop/Programming%20Best%20Practice/AGENTS.md)
- `~/.claude/CLAUDE.md` to this repo's [`CLAUDE.md`](/Users/owenwong/Desktop/Programming%20Best%20Practice/CLAUDE.md)
- `~/.claude/agents/*.md` to the shared Claude workflow agents in [`global/claude-agents/`](/Users/owenwong/Desktop/Programming%20Best%20Practice/global/claude-agents)

Edits to already-linked files apply immediately on the same machine. If you add, rename, or remove shared Claude agent files, rerun the installer so the managed agent list is reconciled.

Restart already-running Codex and Claude Code sessions after installing so they reload the new global files.

See [`docs/global-agent-setup.md`](/Users/owenwong/Desktop/Programming%20Best%20Practice/docs/global-agent-setup.md) for details.

## Hero Product Defaults

The shared global workflow assumes:

- `MRnObrainer` is the hero product by default
- implementation work uses `validator`, `reviewer`, `tester`, and `optimizer`
- higher-risk changes also get a `security-reviewer`
- side projects drop to maintenance-only when the hero product has open release blockers

Additional global roles also ship in [`global/claude-agents/`](/Users/owenwong/Desktop/Programming%20Best%20Practice/global/claude-agents):

- `pm`
- `dogfooder`
- `release-manager`
- `support-triager`
- `benchmark-watcher`

For the external operator workspace and recurring automations, see [`docs/operator-workspace.md`](/Users/owenwong/Desktop/Programming%20Best%20Practice/docs/operator-workspace.md).

## Run the MCP Server

### Default `stdio`

```bash
ai-flow-mcp --transport stdio
```

This is the recommended default for local clients.

### Optional HTTP

```bash
AI_FLOW_MCP_TOKEN=your-token ai-flow-mcp --transport http --host 127.0.0.1 --port 8787
```

HTTP is intended for advanced local hosting or proxy setups. It binds to loopback by default.

## Notion Mirroring

Set:

- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`
- Optional: `NOTION_DAILY_DATABASE_ID` for day-level journals in a separate Notion database

Then use:

```bash
ai-flow sync notion
ai-flow daily-summary --project programming-best-practice
```

Setup details live in [`docs/notion-setup.md`](/Users/owenwong/Desktop/Programming%20Best%20Practice/docs/notion-setup.md).

## Use This Repo As a Skill

This repo ships with a root `SKILL.md`, which lets agents load the repository as an operational skill for:

- activation and setup
- MCP integration
- Notion setup
- passive background configuration
- extending `ai-flow` itself

The skill stays intentionally lean and points agents at the right docs instead of forcing them to read the whole repo.

## Open-Source Distribution

This project is designed to be distributed in more than one way:

- GitHub for source, issues, and release notes
- npm for `ai-flow` and `ai-flow-mcp`
- the official MCP Registry for discoverability by MCP clients
- third-party MCP registries or aggregators such as Smithery

The repo includes [`server.json.example`](/Users/owenwong/Desktop/Programming%20Best%20Practice/server.json.example) as a starting point for registry metadata once you decide the final public package name and repository URL.

Release and distribution notes live in [`docs/open-source-release.md`](/Users/owenwong/Desktop/Programming%20Best%20Practice/docs/open-source-release.md).

## Development

```bash
npm run typecheck
npm run test
npm run build
```

Key rules:

- Keep filesystem outputs deterministic
- Preserve MCP tool names and resource URIs
- Prefer local-first defaults over hosted dependencies
- Keep global config writes explicit, not passive

See [`CONTRIBUTING.md`](/Users/owenwong/Desktop/Programming%20Best%20Practice/CONTRIBUTING.md) for the development workflow.

## Known Limits

- Cursor passive capture may be summary-derived in v1, depending on local artifacts.
- Notion is a mirror, not the canonical store.
- High-confidence auto-apply only writes inside explicitly managed blocks.
