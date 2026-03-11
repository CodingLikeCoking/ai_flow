#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
BACKUP_ROOT="${HOME}/.ai-flow/backups/global-agent-workflow/${TIMESTAMP}"
HOOK_STATUS="skipped"

normalize_claude_hooks() {
  local settings_path="${HOME}/.claude/settings.json"
  if [ ! -f "${settings_path}" ]; then
    return 1
  fi
  node - "${settings_path}" <<'NODE'
const fs = require('fs');

const settingsPath = process.argv[2];
const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
const desired = {
  UserPromptSubmit: 'ai-flow finalize --debug-hook UserPromptSubmit',
  Stop: 'ai-flow finalize --debug-hook Stop',
  TaskCompleted: 'ai-flow finalize --debug-hook TaskCompleted',
  SessionEnd: 'ai-flow finalize --debug-hook SessionEnd'
};

data.hooks = data.hooks || {};

for (const [eventName, command] of Object.entries(desired)) {
  const existing = Array.isArray(data.hooks[eventName]) ? data.hooks[eventName] : [];
  const retained = [];
  let keptManagedEntry = false;

  for (const entry of existing) {
    const isManagedEntry =
      entry &&
      entry.matcher === '*' &&
      Array.isArray(entry.hooks) &&
      entry.hooks.length === 1 &&
      entry.hooks[0] &&
      entry.hooks[0].type === 'command' &&
      entry.hooks[0].command === command;

    if (isManagedEntry) {
      if (!keptManagedEntry) {
        retained.push(entry);
        keptManagedEntry = true;
      }
      continue;
    }

    retained.push(entry);
  }

  if (!keptManagedEntry) {
    retained.push({
      matcher: '*',
      hooks: [{ type: 'command', command }]
    });
  }

  data.hooks[eventName] = retained;
}

fs.writeFileSync(settingsPath, `${JSON.stringify(data, null, 2)}\n`);
NODE
}

verify_claude_hooks() {
  local settings_path="${HOME}/.claude/settings.json"
  if [ ! -f "${settings_path}" ]; then
    return 1
  fi
  node - "${settings_path}" <<'NODE'
const fs = require('fs');

const settingsPath = process.argv[2];
const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
const desired = {
  UserPromptSubmit: 'ai-flow finalize --debug-hook UserPromptSubmit',
  Stop: 'ai-flow finalize --debug-hook Stop',
  TaskCompleted: 'ai-flow finalize --debug-hook TaskCompleted',
  SessionEnd: 'ai-flow finalize --debug-hook SessionEnd'
};

for (const [eventName, command] of Object.entries(desired)) {
  const entries = Array.isArray(data.hooks?.[eventName]) ? data.hooks[eventName] : [];
  const matches = entries.filter(
    (entry) =>
      entry &&
      entry.matcher === '*' &&
      Array.isArray(entry.hooks) &&
      entry.hooks.length === 1 &&
      entry.hooks[0] &&
      entry.hooks[0].type === 'command' &&
      entry.hooks[0].command === command
  );

  if (matches.length !== 1) {
    process.exit(1);
  }
}
NODE
}

backup_path() {
  local target="$1"
  if [ -L "${target}" ] || [ -e "${target}" ]; then
    mkdir -p "${BACKUP_ROOT}"
    cp -R "${target}" "${BACKUP_ROOT}/$(basename "${target}")"
  fi
}

link_path() {
  local source="$1"
  local target="$2"
  mkdir -p "$(dirname "${target}")"
  if [ -L "${target}" ] && [ "$(readlink "${target}")" = "${source}" ]; then
    return
  fi
  backup_path "${target}"
  rm -rf "${target}"
  ln -s "${source}" "${target}"
}

echo "Installing global agent workflow from ${REPO_ROOT}"

link_path "${REPO_ROOT}/AGENTS.md" "${HOME}/.codex/instructions.md"
link_path "${REPO_ROOT}/CLAUDE.md" "${HOME}/.claude/CLAUDE.md"

mkdir -p "${HOME}/.claude/agents"
for existing_agent in "${HOME}"/.claude/agents/*.md; do
  if [ ! -e "${existing_agent}" ] && [ ! -L "${existing_agent}" ]; then
    continue
  fi
  if [ -L "${existing_agent}" ]; then
    existing_source="$(readlink "${existing_agent}")"
    case "${existing_source}" in
      "${REPO_ROOT}/global/claude-agents/"*)
        if [ ! -e "${existing_source}" ]; then
          rm -f "${existing_agent}"
        fi
        ;;
    esac
  fi
done

for agent_file in "${REPO_ROOT}"/global/claude-agents/*.md; do
  link_path "${agent_file}" "${HOME}/.claude/agents/$(basename "${agent_file}")"
done

if command -v ai-flow >/dev/null 2>&1; then
  echo "Refreshing Claude hooks via ai-flow"
  if ! ai-flow install claude-hooks; then
    HOOK_STATUS="failed"
    echo "Warning: failed to refresh Claude hooks; existing global links were still installed" >&2
  elif normalize_claude_hooks && verify_claude_hooks; then
    HOOK_STATUS="verified"
  else
    HOOK_STATUS="missing"
    echo "Warning: Claude hook install ran, but the normalized hook state could not be verified" >&2
  fi
else
  echo "ai-flow not found in PATH; skipping Claude hook installation"
fi

echo
echo "Verification"
echo "- Codex instructions: ${HOME}/.codex/instructions.md -> $(readlink "${HOME}/.codex/instructions.md")"
echo "- Claude memory: ${HOME}/.claude/CLAUDE.md -> $(readlink "${HOME}/.claude/CLAUDE.md")"
echo "- Claude user agents:"
for linked_agent in "${HOME}"/.claude/agents/*.md; do
  if [ ! -e "${linked_agent}" ] && [ ! -L "${linked_agent}" ]; then
    continue
  fi
  if [ -L "${linked_agent}" ]; then
    echo "  - $(basename "${linked_agent}") -> $(readlink "${linked_agent}")"
  else
    echo "  - $(basename "${linked_agent}")"
  fi
done

echo "- Claude hook status: ${HOOK_STATUS}"
echo "- Restart Codex and Claude Code to reload global instructions and user agents in already-running sessions"

if [ -d "${BACKUP_ROOT}" ]; then
  echo "- Backups written to: ${BACKUP_ROOT}"
fi

if [ "${HOOK_STATUS}" = "failed" ] || [ "${HOOK_STATUS}" = "missing" ]; then
  exit 1
fi
