# Operator Workspace

Use an external private workspace such as `~/.operator/` as the control plane for one-person product operations.

This keeps personal operating state outside product repos while still making the workflow reproducible.

## Recommended Layout

- `current-focus.md`
- `today.md`
- `product-decisions.md`
- `customer-signals/`
- `ship-checklists/`
- `prompts/`
- `releases/mrnobrainer/`

## Default Product Policy

- `MRnObrainer` is the hero product by default
- side projects are maintenance-only while MRnObrainer has open release blockers
- weekly review must cut or simplify at least one workflow, feature, or ritual

## Recommended Automations

- `daily-priority-queue`
- `nightly-mrnobrainer-canary`
- `weekly-product-review`
- `release-readiness-summary`
- `customer-signal-digest`

## Installation Model

This repo owns the reusable defaults:

- global instructions
- shared Claude user agents
- operator prompts and checklists you want under version control

The private `~/.operator/` workspace owns:

- live triage state
- daily queues
- release artifacts
- customer-signal notes
