# Global Agent Setup

This repo can act as the source of truth for your machine-wide agent workflow.

The setup script links your live user-level config back to this repository so edits to already-linked files apply automatically on the same machine.

If you add, rename, or remove files under `global/claude-agents/`, rerun the installer so the managed user-agent list is reconciled.

## What It Configures

- Codex global instructions via `~/.codex/instructions.md`
- Claude global memory via `~/.claude/CLAUDE.md`
- Claude user-level subagents via `~/.claude/agents/*.md`
- Claude `ai-flow` hooks if `ai-flow` is installed

## Apply On This Machine

```bash
./scripts/install-global-agent-workflow.sh
```

Then restart already-running Codex and Claude Code sessions so they reload the new global files.

## What The Script Does

1. Backs up existing global instruction files into `~/.ai-flow/backups/global-agent-workflow/<timestamp>/`
2. Symlinks Codex global instructions to this repo's `AGENTS.md`
3. Symlinks Claude global memory to this repo's `CLAUDE.md`
4. Symlinks Claude user-level subagents from `global/claude-agents/`
5. Reinstalls Claude hooks through `ai-flow install claude-hooks` when available
6. Normalizes duplicate `ai-flow` Claude hook entries and verifies the final hook state in `~/.claude/settings.json`
7. Prints verification steps and remaining manual follow-up such as app restarts

## Other Devices

You cannot remotely force another device to pick up the workflow unless that device pulls this repo and runs the same installer.

Recommended process on each additional device:

1. Pull `main`
2. Run `./scripts/install-global-agent-workflow.sh`
3. Restart Codex and Claude Code

## Verification

After setup:

- `~/.codex/instructions.md` should point to this repo's `AGENTS.md`
- `~/.claude/CLAUDE.md` should point to this repo's `CLAUDE.md`
- `~/.claude/agents/` should contain the linked workflow agents
- If `ai-flow` is installed, Claude hooks should exist in `~/.claude/settings.json`
