# Jingxin Hall execution intent

Date: `2026-08-26`
Status: `active`
Parent plan: `docs/aegis/plans/2026-08-26-jingxin-hall.md`

## Requested outcome

Implement and verify the complete approved Jingxin Hall V1 in an isolated feature worktree, preserving the dirty main checkout and publishing no partial room.

## Scope

- Execute the nine plan tasks in order, with the test-tool prerequisite correction recorded in the parent plan.
- Keep all personal calculation and notebook data local to the browser.
- Keep Buddhist and Taoist content/data/media separate.
- Integrate only one public footer seal and one sitemap exclusion seam.

## Non-goals

- No backend, comments, accounts, analytics, cloud sync, AI fortune-teller, payments, custom-domain changes, or partial deployment.
- No cleaning, committing, or overwriting unrelated changes in `E:\Github\zack-zhang1031.github.io`.

## Success evidence and stop condition

Success requires source records, unit tests, type checks, production build, mobile/browser checks, privacy network audit, 300-lot integrity, deployment evidence, and live Worker smoke checks. Stop as complete only after all evidence passes; otherwise stop as blocked, needs-verification, or scope-exceeded with the exact reason.

## BaselineReadSetHint

- `docs/requirements/003-jingxin-hall.md`
- `docs/features/jingxin-hall.md`
- `docs/aegis/specs/2026-08-26-jingxin-hall-design.md`
- `docs/aegis/plans/2026-08-26-jingxin-hall.md`
- `docs/aegis/baseline/2026-08-26-initial-baseline.md`
- Existing package, Astro config, public layout/footer, global styles, and current worktree status.

## BaselineUsageDraft

- Required refs: approved requirement, design, plan, baseline, and current source owners.
- Acknowledged refs: main checkout is dirty; implementation worktree starts at `c7c0914`; baseline build passes.
- Cited refs: parent plan and requirement/design artifacts above.
- Missing refs: rights-verified Guanyin/Lu Zu editions, six images, six audio assets, and Qimen golden fixtures.
- Decision: continue with source-freeze gate; do not ship affected rooms without verified records.

## ImpactStatementDraft

- Affected layers: isolated routes/layout/styles/controllers, local domain modules/data/tests, footer wiring, sitemap configuration, documentation, and approved deployment.
- Invariants: no personal network payload; no plaintext note persistence; no tradition mixing; no public-site behavior change beyond the seal.
- Compatibility: dirty main checkout stays untouched until explicit integration review.
- Risks: cultural source rights, algorithm fixtures, content scale, browser cryptography, bundle size, and footer conflicts.

## Execution Readiness View

- Intent Lock: complete the approved V1, not a reduced novelty page.
- Scope Fence: parent plan's nine tasks and ten routes.
- Baseline Lock: branch `feature/jingxin-hall` in `E:\Github\.codex-worktrees\zack-site-jingxin-hall`, starting from `c7c0914`.
- Owner Constraints: pure domain modules, typed data, local vault, scoped UI, wiring-only public edits.
- Compatibility Boundary: preserve public routes/services and dirty main changes; Worker-only deployment.
- Retirement Boundary: no fallback backend or compatibility path.
- Test Obligations: RED/GREEN, unit, type, build, E2E, privacy, data integrity, and live smoke.
- Review Gates: source rights, verified fixtures, footer reconciliation, all-green release.
- Drift Rules: stop on unverified source, privacy request, owner overlap, repeated verification failure, or new scope.
- Advisory Boundary: checkpoint guidance only; completion requires final verification workflow.
