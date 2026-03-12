# Global Agent Instructions

## Rule 1 — MANDATORY: Search before building

Before proposing or implementing ANY new build, you MUST actively search for existing products, tools, libraries, or open-source repos that solve the same problem. This is non-negotiable and must happen every time, no exceptions.

- Search across multiple platforms: **GitHub**, **GitLab**, **HuggingFace**, **npm**, **PyPI**, **Product Hunt**, and general web search.
- Try multiple keyword variations and synonyms. If the first search yields nothing, rephrase and try at least 2-3 alternative queries (e.g., different terminology, abbreviations, related concepts).
- If ANY similar product or repo is found, **immediately alert the user** with: the name, link, star count / popularity indicators, how closely it matches the user's need, and whether it can be used as-is or adapted.
- Only proceed to build from scratch after the user explicitly confirms they want a custom solution despite existing alternatives.

## Rule 2 — Plan-first workflow (when user provides or requests a plan)

When the user provides a plan, spec, or asks you to plan a build:

0. **Lock requirements first.** Before drafting architecture or emitting any final plan, extract every explicit requirement, constraint, preference, and acceptance condition from all user turns in the current task into a flat checklist. Mark each item as `Covered`, `Deferred`, or `Open question`. Do NOT finalize the plan until every extracted item has a status.
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

## Rule 8 — Approved workflows must run to completion

When the user has already approved a task, workflow, or implementation direction, execute the remaining reversible steps needed to complete that requested outcome without stopping after each substep.

- Treat approval of the overall task as approval to continue through the relevant local workflow: inspect, edit if requested, test if relevant, review, and report results.
- Give brief progress updates when useful. Do not turn obvious continuation into a permission request.
- Do not frame routine continuation as a new request for permission with messages like "Next, I'll ..." when you are already expected to continue.
- Default to finishing the whole approved workflow in one pass, including verification, unless a real blocker appears.

Only stop early for blockers such as:

- destructive or irreversible actions
- any git write or publication action the user has not explicitly authorized, including commit, amend, rebase, branch creation, push, force-push, tag, PR creation, release, or deployment
- missing credentials, external approvals, or unavailable infrastructure
- global or persistent machine changes the user has not explicitly requested
- conflicting local changes that create material risk
- genuine ambiguity where proceeding would likely waste work or damage state

If a blocker appears, pause the blocked path, state the blocker plainly, name the decision needed, and continue only unrelated safe work that does not depend on that decision.

## Rule 9 — Required multi-pass workflow for implementation tasks

For non-trivial implementation, configuration, refactor, or debugging tasks, run a multi-pass workflow instead of treating a single draft as complete.

- Use subagents when the client supports them. If subagents are unavailable, emulate the same workflow with clearly separated passes.
- Keep the passes mostly internal so the user experiences one continuous workflow instead of repeated approval handoffs.
- Required passes:
  - `validator`: spec compliance, missing requirements, and accidental scope creep
  - `reviewer`: bugs, regressions, security concerns, and maintainability risks
  - `tester`: relevant tests, verification steps, and evidence that the change works
  - `optimizer`: cleanup, simplification, performance, and long-term maintainability improvements
- For higher-risk work involving auth, secrets, network access, shell execution, persistence, permissions, or public attack surface, add a dedicated security review pass or make the reviewer explicitly cover security.
- Do not treat self-review as a substitute for these passes.
- Only skip a pass when it is truly inapplicable, and state why.

## Rule 10 — End-of-day activity summary

When the user has explicitly asked for daily reporting or enabled a daily reporting automation, include a short non-technical summary table at the end of the day.

- Only output the table if there was activity that day.
- Group entries by project.
- Use this column format: `Project | What I worked on | Outcome for you | Status`.
- Write for a non-technical reader and compress repeated micro-steps into one row per project where practical.
- Write the daily summary to a Markdown file or external system only when that reporting destination was explicitly requested by the user or automation setup.

## Rule 11 — Hero product first

When there is a designated hero product with open release blockers, prioritize it over side projects.

- Default the active hero product to `MRnObrainer` unless the user explicitly changes it.
- Treat side projects as maintenance-only while the hero product has unresolved release blockers, onboarding friction, or live regressions.
- If work on a side project would delay the hero product without clear leverage, say so plainly and recommend deferring it.

## Rule 12 — Stable path first

Prefer the stable, repeatable path over the most flexible or clever path.

- Keep the default workflow trivial to run and easy to recover.
- Put optional or experimental power in sidecars, plugins, scripts, or explicit opt-in flows instead of the main path.
- If a workflow adds operator burden without clearly shortening time-to-ship, cut or demote it.

## Rule 13 — Cut, do not accumulate

Every weekly operating review must identify at least one workflow, feature, automation, or ritual to remove, simplify, or stop using.

- Favor subtraction over adding more permanent process.
- If two mechanisms solve the same problem, standardize on one and remove the weaker path.

## Rule 14 — Solo operator defaults

Assume a one-person team unless the user says otherwise. Optimize for shipping speed with low operator overhead.

- Default to working directly on `main` when the user has authorized git writes.
- Do not introduce branch workflows, PR choreography, release branches, or rebase rituals unless the user explicitly asks for them or the repository already requires them.
- Prefer one clear path that inspects, edits, verifies, and reports in one pass.
- Use the full available context budget to reduce back-and-forth, but spend it on doing the work rather than narrating the workflow.
- If extra process does not materially reduce risk or time-to-ship, cut it.
