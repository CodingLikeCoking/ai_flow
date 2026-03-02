import type { ProviderAdviceRule } from "../types.js";

export function getProviderAdviceRules(): ProviderAdviceRule[] {
  return [
    {
      provider: "openai",
      slug: "codex-concise-prompts",
      summary: "Keep Codex prompts concise",
      recommendation: "Prefer shorter coding prompts and avoid unnecessary preambles."
    },
    {
      provider: "openai",
      slug: "openai-docs-mcp",
      summary: "Prefer OpenAI docs MCP for OpenAI product questions",
      recommendation: "Use the official Docs MCP before generic web search for OpenAI product setup."
    },
    {
      provider: "anthropic",
      slug: "claude-md-memory",
      summary: "Persist repeated corrections in CLAUDE.md",
      recommendation: "Promote repeated instructions into CLAUDE.md instead of repeating them in chat."
    },
    {
      provider: "anthropic",
      slug: "claude-hooks",
      summary: "Use Claude hooks for passive lifecycle capture",
      recommendation: "Install Claude Code hooks to improve passive completion detection."
    }
  ];
}
