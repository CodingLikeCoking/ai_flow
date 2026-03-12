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
2. For any planning or design task, lock requirements before architecture.
   - Extract every explicit user requirement, constraint, preference, and acceptance condition from the current task into a flat checklist.
   - Mark each item as `Covered`, `Deferred`, or `Open question`.
   - Do not finalize a plan until every extracted item has a status.
3. If the user has already approved a task or workflow, keep executing the remaining reversible steps needed to complete that requested outcome without waiting for confirmation on each obvious next step.
4. Only pause when there is a real blocker: destructive actions, unauthorized git write or publication actions, missing credentials, conflicting local changes, global or persistent machine changes, or ambiguity that creates material risk.
5. Give concise progress updates when useful, but do not stop just to announce routine continuation.
6. Do not perform global or persistent setup steps such as `npm link`, LaunchAgent installation, hook installation, or writing agent config unless the user explicitly asked for that setup in this session.
7. If the user explicitly wants local activation, run only the minimum required steps for that goal.
   - Core local verification: `npm install`, `npm run build`, `npm run test`, `ai-flow doctor`
   - Optional setup only if explicitly requested: `npm link`, `ai-flow init --project <path> --project-name "<name>"`
8. If the user wants passive background scanning:
   - Read `docs/launchd-setup.md`
   - Show or explain the LaunchAgent steps
   - Install the LaunchAgent only if the user explicitly asked for that setup
9. If the user wants agent integration:
   - Read `docs/codex-cursor-mcp-setup.md`
   - Run `ai-flow print codex-mcp-config` or `ai-flow print cursor-mcp-config` to show the config
   - For Claude Code, read `docs/claude-hooks.md`
   - Write agent config or install hooks only if the user explicitly asked for that setup
10. If the user wants Notion:
   - Read `docs/notion-setup.md`
11. If the user wants release or distribution guidance:
   - Read `docs/open-source-release.md`
12. For non-trivial implementation, configuration, refactor, or debugging work, use a multi-pass workflow before declaring the task done.
   - Required passes: `validator`, `reviewer`, `tester`, `optimizer`
   - Add a security-focused review pass for higher-risk work involving auth, secrets, network, shell execution, persistence, permissions, or public attack surface
   - If the environment does not support subagents, emulate the same passes explicitly in sequence
   - Keep these passes mostly internal so the user sees one continuous execution flow instead of repeated approval handoffs
13. Treat `MRnObrainer` as the hero product by default.
   - If it has open release blockers, side projects are maintenance-only unless the user explicitly overrides that priority
14. Prefer stable, repeatable paths over optional complexity.
   - Keep the default path easy to run and recover
   - Put experimental power in sidecars, plugins, or explicit opt-in scripts
15. During weekly review flows, identify at least one workflow, feature, or ritual to cut or simplify.
16. Assume a one-person team unless the user says otherwise.
   - Default to `main` for git work once the user has authorized writes
   - Avoid branch workflows, PR choreography, or release-branch process unless the user explicitly requests it or the repo already requires it
   - Use available context and token budget to finish the work, not to add extra ceremony

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
