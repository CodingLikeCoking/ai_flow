# Open Source Release Notes

## Included in v0.1

- `ai-flow` CLI
- `ai-flow-mcp` server
- `stdio` transport
- Streamable HTTP transport
- Passive adapters for Codex, Claude Code, and Cursor
- Filesystem-first prompt logging and dataset export
- Root `SKILL.md` so agents can use the repo as a skill

## Recommended Distribution Channels

### 1. GitHub

Use GitHub for:

- source code
- issues and discussions
- changelogs
- signed release tags

### 2. npm

Publish the package so users can install:

```bash
npm install -g <your-package-name>
```

This is the easiest path for CLI usage and for MCP `stdio` clients that launch the server by command name.

Before publishing:

- confirm the final package name is available
- add `repository`, `homepage`, and `bugs` fields to `package.json`
- keep the `bin` entries for both `ai-flow` and `ai-flow-mcp`

### 3. Official MCP Registry

List the MCP server in the official MCP Registry so MCP-capable clients can discover it outside GitHub.

Recommended preparation:

- publish the package to npm first
- add final package metadata and ownership details
- copy `server.json.example` to `server.json` and replace the placeholders
- follow the registry quickstart for the required metadata and listing flow

### 4. Third-Party MCP Registries

Also consider publishing to:

- Smithery
- client-specific MCP directories and marketplaces

These are useful for discovery, but the official registry should be treated as the primary source when possible.

## Known Limits

- Cursor capture is summary-derived in v1 unless richer local artifacts are available.
- `better-sqlite3` is used for the Cursor adapter, so native module builds must succeed on the install machine.
