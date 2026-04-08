# Infinite Swinger Automation Operating Rules

This file holds the stable rules for recurring Codex improvement runs on this repo.

## Mission

Ship small, real improvements that make Infinite Swinger feel smoother, clearer, and more professional.

Prioritize:

1. Gameplay feel and input clarity
2. UI polish and layout integrity
3. Level and map readability
4. Progression depth, replay value, and diagnostics
5. Performance, reliability, and release safety

## Operating Loop

Every run should follow this order:

1. Research the current repo state before editing
2. Scope one bounded change with explicit done criteria
3. Implement only that change
4. Verify with the strongest relevant checks
5. Record a short summary and next best follow-up

Do not skip research or verification.

## Recommended Run Prompt

Use this as the stable recurring prompt for self-building runs:

> Continue developing Infinite Swinger from the local checkout. Start by inspecting the current repo state, recent diffs, and any dirty files before choosing work. Then ship exactly one bounded, player-visible improvement with explicit done criteria. Prefer the single highest-leverage upgrade to gameplay feel, UI polish, level readability, progression clarity, or diagnostics over brainstorming or broad rewrites. Treat multiplayer, online leaderboard sync, and other networked features as research-only unless the repo already has the necessary foundations. If the safest scope is unclear or the workspace is dirty, continue on a feature branch and never overwrite user changes. Verify with `npm run check` and `npm run build` when feasible, fix anything you break, and leave a concise summary with test results, risks, and the next best follow-up.

This prompt follows the playbook pattern from March 31, 2026: research first, synthesize a narrow spec, implement one lane, verify skeptically, and save only compact durable notes.

## Research Rules

- Read the current code, recent diffs, and any nearby UI or gameplay files before changing behavior
- Use evidence from the repo, not guesses
- Prefer parallel research only when tasks do not edit the same files
- Treat unstable or dirty worktrees as a signal to branch or narrow scope

## Change Rules

- Make one coherent improvement per run
- Prefer changes that are visible to players over internal churn
- Avoid overlapping overlays, blocked controls, cramped layouts, and unreadable map states
- Keep the atlas readable: UI should dock cleanly and preserve space for the map
- Use existing design language unless the current surface is clearly broken
- Do not rewrite large systems unless verification proves that is necessary

## Verification Rules

At minimum, run:

- `npm run check`
- `npm run build`

When UI is changed, also inspect the surface in a browser and explicitly check for:

- overlap between panels
- blocked map nodes or controls
- desktop and mobile layout failures
- clipped text, cramped buttons, or unreadable chips

Apply a fresh-verifier pass before closing a run:

- Did the patch satisfy explicit done criteria?
- Did behavior drift outside the intended surface?
- Were any protected or high-churn files touched without a clear reason?
- Would a human reviewer understand what changed and why?

## Branching And Safety

- If the workspace is dirty or the safest scope is unclear, create or continue a feature branch
- Do not overwrite user changes
- Avoid editing the same hot files as an unfinished change unless you understand the local context
- Keep destructive actions off-limits unless explicitly requested

## Commit And Push

- Commit only after the change is coherent and verified
- Use intentional commit messages tied to the shipped improvement
- Push only when the branch is ready and remote state is understood
- Prefer feature branches over direct pushes to `main`

## Memory And Notes

- Keep summaries compact and dated
- Save durable lessons only when they will help future runs
- Do not preserve transient noise, stale observations, or duplicate notes

## What Good Looks Like

A strong automation run leaves the repo in a better state, with one real improvement shipped, checks passing, UI verified, and the next most valuable follow-up clearly identified.
