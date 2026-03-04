# Global Agent Instructions

## Rule 1 — MANDATORY: Search before building

Before proposing or implementing ANY new build, you MUST actively search for existing products, tools, libraries, or open-source repos that solve the same problem. This is non-negotiable and must happen every time, no exceptions.

- Search across multiple platforms: **GitHub**, **GitLab**, **HuggingFace**, **npm**, **PyPI**, **Product Hunt**, and general web search.
- Try multiple keyword variations and synonyms. If the first search yields nothing, rephrase and try at least 2-3 alternative queries (e.g., different terminology, abbreviations, related concepts).
- If ANY similar product or repo is found, **immediately alert the user** with: the name, link, star count / popularity indicators, how closely it matches the user's need, and whether it can be used as-is or adapted.
- Only proceed to build from scratch after the user explicitly confirms they want a custom solution despite existing alternatives.

## Rule 2 — Plan-first workflow (when user provides or requests a plan)

When the user provides a plan, spec, or asks you to plan a build:

1. **Visualize first.** Generate a Mermaid diagram of the plan — showing components, data flow, and dependencies — so the user can see the architecture at a glance.
2. **Break down into blocks.** Decompose the plan into individual tasks / building blocks.
3. **Search per block.** For EACH block, search the web (GitHub, GitLab, HuggingFace, npm, PyPI, etc.) for free, open-source tools, libraries, or existing repos that can fulfil that block. Try multiple keyword variations per block.
4. **Report findings.** Present a summary table to the user: each block, what existing tools/repos were found (with links), and a recommendation (use as-is / adapt / build custom).
5. **Confirm with user.** Wait for the user to acknowledge or choose which existing tools to adopt before proceeding with implementation. Do NOT silently skip any block.
6. **Prefer existing over new.** Always prefer integrating an existing, well-maintained function, library, or tool over writing new code. Only build from scratch when no suitable option exists or the user explicitly requests it.

## Rule 3 — Build-vs-buy

For implementation recommendations, provide a brief build-vs-buy comparison and state why the chosen path is best for the user's constraints.

## Rule 4 — Opt-out

If the user explicitly asks to skip external-product research, follow the user's instruction.

## Rule 5 — Free tier by default

Prefer free-tier or free services by default. Do not recommend paid tiers unless free options are insufficient and the user approves.

## Rule 6 — Cloud cost optimization

For cloud work (especially Vercel), optimize to reduce free-tier usage (bandwidth, invocations, builds, storage): use local development first, minimize unnecessary deployments, and apply caching/quotas where relevant.

## Rule 7 — Account hygiene

When cloud usage limits are near exhaustion, proactively suggest account/scope separation or token-based workflows to avoid accidental usage of the wrong account.
