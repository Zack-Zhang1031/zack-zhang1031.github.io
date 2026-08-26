# Jingxin Hall implementation plan

## Goal

Implement the approved hidden `静心堂` V1 at `/jing/`: an immersive, mobile-first, local-only cultural study space with respectful Buddhist and Taoist rooms, woodfish and opt-in ambience, Five Elements/Bagua reference material, Bazi, five I Ching casting methods, three independently derived Qimen schools, three verified 100-lot collections, optional divination cups, and encrypted local notes.

## Architecture

Keep the public Astro site as the host and add a separate `JingLayout.astro` route shell. Pages render static explanatory content through Astro and load narrowly scoped TypeScript controllers only inside the room that needs them. Pure modules own calculations; typed static files own cultural/source data; one local-vault module owns encrypted persistence. No backend, SPA router, account, comments, analytics, geolocation, or third-party runtime API is added.

## Tech Stack

- Existing Astro `5.18.2`, TypeScript strict mode, static output, npm lockfile.
- `lunar-typescript@1.8.6` as the wrapped calendar primitive, pinned through `package-lock.json`; no direct library calls from UI components.
- `vitest@4.1.11` for pure-module and data-integrity tests.
- `@playwright/test@1.62.1` for mobile, privacy, accessibility-flow, and sitemap smoke tests.
- `@astrojs/check@0.9.10` with `typescript@6.0.3` for Astro and strict TypeScript diagnostics.
- Browser Web Crypto (`PBKDF2` + `AES-GCM`) and `crypto.getRandomValues`.
- Native HTML, CSS, Audio, Web Components-free DOM controllers; no frontend framework island.

## Baseline/Authority Refs

- `docs/requirements/003-jingxin-hall.md`
- `docs/features/jingxin-hall.md`
- `docs/aegis/specs/2026-08-26-jingxin-hall-design.md`
- `docs/aegis/baseline/2026-08-26-initial-baseline.md`
- `src/layouts/BaseLayout.astro`, `src/styles/global.css`, `astro.config.mjs`, and `package.json`
- Official Astro sitemap `filter(page)` contract: <https://docs.astro.build/en/guides/integrations-guide/sitemap/>
- Official Vitest setup and `vitest run`: <https://vitest.dev/guide/>
- Candidate primary-text evidence: Wikisource public-domain Qing Guan Di edition, the Lungshan Temple Guanyin index for collation, and the 1846 Lu Zu scan recorded in the source ledger before use.

## Compatibility Boundary

- Preserve all public routes, comments, account UI, games, posts, theme behavior, and existing user worktree changes.
- Add only one deliberate public discovery seam: the footer `静` seal.
- Exclude every `/jing/` URL from sitemap and public navigation/search and emit `noindex, nofollow` on each Jingxin page.
- Treat route obscurity only as discoverability control; private notes rely on encryption.
- Keep temporary personal inputs in memory and block all network submission from Jingxin controllers.
- Deploy only after complete V1 acceptance, only to the existing `z.zz1031.workers.dev` path, and do not touch `zackzhang.dev`.

## Verification

Primary commands from the repository root:

```powershell
npm ci
npm run test
npm run check
npm run build
npx playwright test
```

Expected final evidence: all Vitest and Playwright tests pass; Astro type checking and production build exit `0`; every expected `/jing/` route exists; generated sitemaps contain no `/jing/`; browser network logs contain no Jingxin personal payloads; each lot collection validates exactly `1..100`; licensed source metadata is complete.

## Planning readback

### Aegis Visibility

Planning is required because ten routes share security, calendar, source-integrity, tradition-separation, and release contracts while retaining independent owners and verification gates.

### BaselineUsageDraft

- Required baseline refs: approved requirements, feature design, design specification, current Astro owners, and initial baseline.
- Delivered context refs: all user-approved naming, route, privacy, ritual, algorithm, visual, source, and delivery decisions.
- Acknowledged before plan refs: dirty main worktree; public-layout overlap; Worker-only deployment boundary.
- Cited in plan refs: the four local authority documents and official technical references listed above.
- Missing refs: exact source edition/checksum for Guanyin and Lu Zu, sacred-image licenses, ambience licenses, and golden Qimen fixtures.
- Decision: continue with a mandatory source-freeze task; affected rooms cannot pass their gate until those records are complete.

### Requirement Ready Check

- Requirement source refs: `docs/requirements/003-jingxin-hall.md` and approved design.
- Goals and scope refs: all ten approved routes and seven delivery stages.
- User/scenario refs: local private use, mobile use, cultural study, and inspectable derivation.
- Requirement item refs: functional, privacy, safety, source, data, UI, and delivery contracts.
- Acceptance refs: design specification section 9 and this plan's verification section.
- Open blocker questions: none for starting source verification and shell work.
- Decision: ready.

### Change Necessity

- User-visible need: new interactive routes, local calculations, encrypted notes, media controls, and hidden discovery.
- No-change/non-code option: articles alone cannot provide local charting, encryption, casting, or accessible interaction.
- Why code change is necessary: the approved behaviors require browser state, deterministic calculation modules, cryptography, and route metadata.
- Minimum change boundary: one footer link and sitemap filter in existing owners; all other behavior in a scoped Jingxin subtree.
- Decision: code-change.

### Existence Check

- Proposed new surface: Jingxin layout, room routes/controllers, pure domain modules, static source data, local vault, and tests.
- Existing reuse candidate: `BaseLayout.astro`, `global.css`, Waline/Neon, and a single long Astro page.
- Why existing surface is insufficient: the public shell includes tracking/comments/navigation and is already 355 lines; global CSS is 1321 lines; sensitive local functionality needs isolated ownership and loading.
- Creation proof: the dedicated subtree prevents public services and mixed-purpose owners from absorbing private or tradition-specific logic.
- Entropy/retirement impact: no backend or adapter fallback; modules split by stable domain; the public owner receives wiring only.
- Decision: add-with-proof.

### Architecture Integrity Lens

- Invariant: personal inputs never cross the network; Buddhist/Taoist sources never merge; calculations expose one versioned derivation.
- Canonical owners: `src/lib/jing/**` for rules/security, `src/data/jing/**` for source data, `src/components/jing/**` for UI, and `JingLayout.astro` for shell metadata.
- Responsibility overlap: UI cannot calculate calendar rules or access storage directly; public layout cannot own Jingxin state.
- Higher-level simplification: one random-source interface, one local-vault envelope, one I Ching line model, and one Qimen result contract.
- Retirement/falsifier: no old Jingxin owner exists; reject any implementation that adds a second persistence or calculation owner.
- Verdict: proceed with isolated owners.

### Plan Pressure Test

- Owner/contract/retirement: explicit owners, versioned contracts, no compatibility carrier.
- Architecture integrity/higher-level path: shared primitives are limited to random, vault, line model, and Qimen contract.
- Verification scope: unit, data-integrity, browser privacy, mobile, build, sitemap, and live smoke.
- Task executability: each batch has named files, RED/GREEN commands, and a commit boundary.
- Pressure result: proceed.

### Complexity Budget

- Artifact class: source, tests, static datasets, and durable plan.
- Target files/artifacts: new scoped owners plus wiring in `BaseLayout.astro`, `astro.config.mjs`, and `package.json`.
- Current pressure: `BaseLayout.astro` is 355 lines and `global.css` is 1321 lines; both are mixed public-site owners.
- Projected pressure: over-budget if Jingxin behavior is added in place; within-budget with a dedicated layout/style/controller subtree.
- Budget result: within-budget with wiring-only edits to existing large owners.
- Planned governance: keep each calculation/controller testable alone; split each 100-lot collection; prohibit a generic all-in-one `jing.ts`.

### Plan-Time Complexity Check

- Target files: public layout/footer, global style, sitemap config, new Jingxin subtree, data and tests.
- Existing size/shape signals: public CSS exceeds the strong 1200-line pressure signal.
- Owner fit: only the footer seal belongs in `BaseLayout.astro`; no Jingxin CSS belongs in `global.css` except the seal's public-footer style.
- Add-in-place risk: mixed privacy, tracking, animation, and religious presentation concerns.
- Better file boundary: `JingLayout.astro`, `jing.css`, per-room controllers, pure domain folders, split datasets.
- Recommendation: wiring-only public edits and new scoped owner files.

## File map

### Modify

- `package.json`, `package-lock.json`: pinned runtime/test dependencies and `test`, `check`, `test:e2e` scripts.
- `astro.config.mjs`: sitemap exclusion for `/jing/`.
- `src/layouts/BaseLayout.astro`: footer `静` seal only; reconcile against dirty changes before commit.
- `src/styles/global.css`: footer seal styling only; no room styling.
- `docs/features/jingxin-hall.md`, `docs/requirements/README.md`, `docs/features/README.md`, `docs/aegis/INDEX.md`: implementation/source status and indexes.

### Create: shell and pages

- `src/layouts/JingLayout.astro`
- `src/styles/jing.css`
- `src/pages/jing/index.astro`
- `src/pages/jing/muyu.astro`
- `src/pages/jing/fo.astro`
- `src/pages/jing/dao.astro`
- `src/pages/jing/yixue.astro`
- `src/pages/jing/bazi.astro`
- `src/pages/jing/yijing.astro`
- `src/pages/jing/qimen.astro`
- `src/pages/jing/chouqian.astro`
- `src/pages/jing/notes.astro`

### Create: components/controllers

- `src/components/jing/HallIntro.astro`
- `src/components/jing/SoundControl.astro`
- `src/components/jing/WoodfishPanel.astro`
- `src/components/jing/ReverencePanel.astro`
- `src/components/jing/BaziForm.astro`
- `src/components/jing/YijingCaster.astro`
- `src/components/jing/QimenForm.astro`
- `src/components/jing/LotSystem.astro`
- `src/components/jing/LocalNotebook.astro`

### Create: domain and data

- `src/lib/jing/random.ts`
- `src/lib/jing/settings.ts`
- `src/lib/jing/vault.ts`
- `src/lib/jing/calendar/types.ts`
- `src/lib/jing/calendar/engine.ts`
- `src/lib/jing/calendar/true-solar-time.ts`
- `src/lib/jing/bazi/calculate.ts`
- `src/lib/jing/bazi/interpret.ts`
- `src/lib/jing/yijing/lines.ts`
- `src/lib/jing/yijing/cast.ts`
- `src/lib/jing/yijing/derive.ts`
- `src/lib/jing/qimen/types.ts`
- `src/lib/jing/qimen/base-chart.ts`
- `src/lib/jing/qimen/chai-bu.ts`
- `src/lib/jing/qimen/zhi-run.ts`
- `src/lib/jing/qimen/maoshan.ts`
- `src/lib/jing/qimen/compare.ts`
- `src/lib/jing/lots/types.ts`
- `src/lib/jing/lots/draw.ts`
- `src/lib/jing/lots/validate.ts`
- `src/data/jing/source-ledger.ts`
- `src/data/jing/figures.ts`
- `src/data/jing/yixue.ts`
- `src/data/jing/cities.ts`
- `src/data/jing/hexagrams.ts`
- `src/data/jing/lots/guanyin.ts`
- `src/data/jing/lots/luzu.ts`
- `src/data/jing/lots/guandi.ts`

### Create: static media and tests

- `public/jing/images/{shakyamuni,guanyin,ksitigarbha,yuanshi,lingbao,daode}.webp`
- `public/jing/audio/{woodfish,chime,bell,windchime,water,pine-wind}.ogg`
- Co-located `*.test.ts` for every `src/lib/jing/**` owner and `src/data/jing/lots/lots.test.ts`.
- `playwright.config.ts`
- `tests/e2e/jingxin.spec.ts`

## Domain contracts fixed before implementation

```ts
export interface RandomSource { uint32(): number }
export interface DerivationStep { label: string; rule: string; value: string }
export interface CalculationEnvelope<T> {
  algorithm: string
  version: string
  output: T
  derivation: DerivationStep[]
  warnings: string[]
}
export type Tradition = 'buddhist' | 'taoist'
export type QimenSchool = 'chai-bu' | 'zhi-run' | 'maoshan'
export type YijingLine = 6 | 7 | 8 | 9
export interface LotRef { tradition: Tradition; collectionId: 'guanyin' | 'luzu' | 'guandi'; number: number }
```

These contracts are canonical. UI code consumes them and must not create parallel result shapes.

## Task 1: Establish isolated execution and source-freeze gates

**Files:** Modify `package.json`, `package-lock.json`; create `src/data/jing/source-ledger.ts`, `src/data/jing/source-ledger.test.ts`; inspect the exact footer hunks in `BaseLayout.astro` and `global.css`.

**Why:** Cultural content and algorithms cannot ship without traceable editions, licensing, and fixtures; the dirty public-site worktree must remain intact.

**Change Necessity:** A machine-validated source ledger is the minimum durable owner; chat notes cannot enforce asset and collection completeness.

**Impact/Compatibility:** No runtime route or public UI changes. Start execution in `E:\Github\.codex-worktrees\zack-site-jingxin-hall` on branch `feature/jingxin-hall` from commit `fe8af72`; do not reuse or clean the dirty main checkout.

**Verification:** `npm run test -- src/data/jing/source-ledger.test.ts`; expected first RED is missing required records, final GREEN is six figures, six audio files, three lot editions, calendar reference, I Ching reference, and three Qimen fixture sources with non-empty URL, title, license/status, retrieval date, version/checksum, and local target.

- [ ] Install the five pinned packages from Tech Stack and add `test: vitest run`, `check: astro check`, and `test:e2e: playwright test` scripts.
- [ ] Write `source-ledger.test.ts`, run it, and record the missing-record RED output; assert exact required IDs and blocking status unless each record is verified with attribution and checksum.
- [ ] Create the typed ledger; record Wikisource's Qing Guan Di edition, the Guanyin and Lu Zu primary scans selected after rights verification, six image records, six audio records, and rule/fixture references. Mark a record `verification-blocked` instead of inventing metadata.
- [ ] Run the focused test; proceed beyond the affected content task only when all of its records are GREEN.
- [ ] Commit only ledger/tests with `[jing] test: freeze cultural source ledger`.

## Task 2: Add the test harness and hidden shell

**Files:** Modify `astro.config.mjs`, `BaseLayout.astro`, `global.css`; create `playwright.config.ts`, `JingLayout.astro`, `jing.css`, `HallIntro.astro`, and `src/pages/jing/index.astro`.

**Why:** Every later room needs the same privacy metadata, theme, navigation, mobile, and verification shell.

**Change Necessity:** Static prose cannot enforce sitemap exclusion or consistent room metadata; the minimum public edit is one footer link plus a sitemap filter.

**Impact/Compatibility:** Install only the five pinned packages named in Tech Stack. In the dirty-main reconciliation, preserve current navigation order, account modal, analytics, and back-to-top behavior; the Jing layout imports none of those public services.

**Verification:** `npm run check && npm run build && npx playwright test tests/e2e/jingxin.spec.ts`; assert footer seal exists, `/jing/` has `robots=noindex,nofollow`, no public nav is rendered there, theme persists, return-home works, and built sitemap has no URL whose pathname starts `/jing/`.

- [ ] Add the Playwright configuration and test that fails because `/jing/` and the seal do not exist.
- [ ] Run the focused E2E test with the Task 1 toolchain and capture RED.
- [ ] Implement the independent layout, hall, intro acknowledgement, footer seal, scoped style, and `sitemap({ filter: page => !new URL(page).pathname.startsWith('/jing/') })`.
- [ ] Run `npm run check`, `npm run build`, and the focused Playwright test; inspect `dist/sitemap-*.xml` with `rg -n "/jing/" dist/sitemap-*.xml` and expect no matches.
- [ ] Commit `[jing] add: hidden hall shell` after reviewing the footer diff against the dirty-main version.

## Task 3: Implement settings, secure randomness, and encrypted notes

**Files:** Create `random.ts`, `settings.ts`, `vault.ts` and tests; create `SoundControl.astro`, `LocalNotebook.astro`, `notes.astro`.

**Why:** Privacy and deterministic testability are cross-cutting gates for all interactive rooms.

**Change Necessity:** Browser storage without a single vault owner risks plaintext leakage; random drawing without injection cannot be tested.

**Impact/Compatibility:** Persist only namespaced `jing.settings.v1` and `jing.vault.v1`. Use PBKDF2-SHA-256 with a random 16-byte salt, 310,000 iterations, AES-GCM-256, and a random 12-byte IV; the envelope carries version and parameters. Key and plaintext remain in memory.

**Verification:** `npm run test -- src/lib/jing/random.test.ts src/lib/jing/settings.test.ts src/lib/jing/vault.test.ts`; cover unbiased bounded integers, crypto round-trip, wrong password, tamper detection, version rejection, failed-import non-overwrite, 15-minute default lock, and storage denial.

- [ ] Write focused failing tests using a deterministic injected `RandomSource`, Web Crypto, and an in-memory `Storage` fake.
- [ ] Run the focused tests and confirm RED for missing owners.
- [ ] Implement the minimal versioned modules and notes UI with lock, unlock, clear, encrypted `.jing` export, validated import, and current-session idle timer.
- [ ] Run focused tests plus `npm run check`; manually confirm no plaintext note appears in Local Storage or exported JSON.
- [ ] Commit `[jing] add: encrypted local notebook`.

## Task 4: Implement woodfish, opt-in audio, and separate reverence rooms

**Files:** Create `WoodfishPanel.astro`, `ReverencePanel.astro`, `muyu.astro`, `fo.astro`, `dao.astro`, `figures.ts`, approved images/audio, and component E2E coverage.

**Why:** Deliver the quiet and respectful core without game economy or tradition mixing.

**Change Necessity:** Timing, keyboard/touch, opt-in media, and three-phase reverence require scoped controllers; static markup alone is insufficient.

**Impact/Compatibility:** Audio objects are created only after user activation. Figure data requires `tradition`, attribution, and license. Buddhist and Taoist pages filter by exact tradition and cannot import each other's ambience group.

**Verification:** E2E asserts click/Space/touch count, pause/reset, elapsed/rhythm display, no merit/rank/reward strings, no audio request before activation, reduced-motion static completion, image is not a button, and exact three figures per room.

- [ ] Add failing E2E cases and figure-data integrity tests for separation, attribution, and license.
- [ ] Run focused tests and capture RED.
- [ ] Add verified media files, typed figure data, lazy sound control, woodfish controller, and reverence controller with `阅读介绍 -> 合掌礼敬 -> 三段过程 -> 中性结束语`.
- [ ] Run tests at desktop and 390x844 mobile sizes, then inspect the network trace for zero pre-gesture audio requests.
- [ ] Commit `[jing] add: quiet practice and reverence rooms`.

## Task 5: Implement Yixue reference, calendar adapter, and Bazi

**Files:** Create `yixue.ts`, `cities.ts`, Yixue page, calendar types/engine/solar-time modules, Bazi calculate/interpret modules, `BaziForm.astro`, Bazi page, and co-located tests.

**Why:** Provide local charts with transparent timing rules and bounded interpretation.

**Change Necessity:** Calendar boundaries and true-solar-time correction require a tested adapter; UI must not call `lunar-typescript` directly.

**Impact/Compatibility:** Supported range is 1900-2100. Legal time is default; true solar and late-Zi are explicit options. Interpretation consumes a calculation envelope and cannot alter pillars.

**Verification:** Golden tests cover `1986-05-29 00:00 Asia/Shanghai`, both sides of 2024 Lichun, one ordinary Jie month boundary, Beijing/Urumqi longitude correction, same-day/next-day late-Zi modes, unsupported years, and boundary warnings. Cross-check every golden fixture against the recorded primary/reference tool before freezing it.

- [ ] Write failing adapter and Bazi tests with exact fixture inputs, expected four pillars, effective timestamp, rule version, and warnings from the verified fixture ledger.
- [ ] Run focused tests and confirm RED.
- [ ] Implement the wrapped calendar adapter, true-solar calculation, city/manual longitude input, pillar derivation, Five Elements/Ten Gods summaries, and bounded interpretation sections.
- [ ] Run focused tests, `npm run check`, and mobile E2E; verify refresh clears every birth field/result and no request contains form values.
- [ ] Commit `[jing] add: local bazi study tools`.

## Task 6: Implement all I Ching casting methods

**Files:** Create `hexagrams.ts`, line/cast/derive modules and tests, `YijingCaster.astro`, and `yijing.astro`.

**Why:** One canonical line model prevents five input methods and five derived views from disagreeing.

**Change Necessity:** Casting, moving-line transformation, and derived relationships require pure deterministic logic with injectable randomness.

**Impact/Compatibility:** Store lines bottom-to-top as `6|7|8|9`; only 6 and 9 move. Numeric/time rules display their formulas. No result persists by default.

**Verification:** Tests cover manual `[7,8,9,7,6,8]`, deterministic coin sequences, 49-stalk conservation through every yarrow operation, numeric/time normalization, all 64 binary mappings, involution properties for opposite/reversed operations, and primary/changed/mutual output.

- [ ] Write failing property/table tests and E2E cases for all five method tabs.
- [ ] Run focused tests and capture RED.
- [ ] Implement the canonical line representation, each cast adapter, derivations, 64-entry source data, and step-by-step UI.
- [ ] Run unit tests, type checks, build, and 390px E2E; verify invalid manual lines show an inline error.
- [ ] Commit `[jing] add: complete yijing casting`.

## Task 7: Implement three independent Qimen schools

**Files:** Create Qimen types/base-chart/chai-bu/zhi-run/maoshan/compare modules and tests, `QimenForm.astro`, and `qimen.astro`.

**Why:** The approved comparison is meaningful only if each school keeps its own ju-selection derivation and fixtures.

**Change Necessity:** No existing site owner implements Qimen; a shared base chart plus three school modules is the minimum boundary that avoids duplicated astronomy while preventing synthetic result mixing.

**Impact/Compatibility:** The result contract records school and version. Comparison may align cells visually but never average or overwrite differences. If any school lacks verified fixtures, the whole Qimen stage remains unpublished.

**Verification:** For each school, freeze at least 12 exact reference fixtures spanning yin/yang dun, solstice vicinity, Jie boundaries, and upper/middle/lower yuan. Tests assert ju number/direction, nine-palace placements, chief/star/door/deity positions, derivation labels, and known inter-school differences.

- [ ] Transcribe the verified fixtures into tests first and have a second pass compare every field to the recorded source page/edition.
- [ ] Run all Qimen tests and confirm RED.
- [ ] Implement shared calendrical input normalization and each school module independently, then add a read-only comparison adapter and UI.
- [ ] Run focused tests, type checks, mobile chart E2E, and a mutation check proving one school result cannot modify another.
- [ ] Commit `[jing] add: compare qimen schools`.

## Task 8: Implement and validate the complete three-collection lot system

**Files:** Create lot types/draw/validate modules, three 100-entry data files, lot tests, `LotSystem.astro`, and `chouqian.astro`.

**Why:** A complete system needs source fidelity, independent collections, safe interpretation, repeat-draw handling, and optional cups.

**Change Necessity:** Generic arrays or remote APIs cannot enforce exact collection identity, licensing, or offline privacy.

**Impact/Compatibility:** Guanyin is Buddhist; Lu Zu and Guan Di are Taoist/folk rooms. Each record carries source edition/version. Modern topic interpretation is newly written and mechanically scanned for prohibited certainty language.

**Verification:** `lots.test.ts` asserts each collection has exactly 100 entries numbered 1-100, unique IDs, correct tradition, source metadata, original text, allusion, class, topic interpretations, cautions, and no cross-collection object reuse. Injected randomness proves fair index mapping. E2E verifies original lot survives cup results and rapid redraw warning.

- [ ] Write failing schema, sequence, source, prohibited-language, random-draw, cup, and repeat-draw tests before adding collection content.
- [ ] Run focused tests and confirm all missing/invalid data is reported by collection and number.
- [ ] Transcribe original text from the verified editions, write original modern explanations, add source/revision metadata, and implement drawing/cups/history-in-memory UI; do not scrape or copy modern commentary.
- [ ] Run integrity tests after each 100-entry collection, then all unit/E2E tests; manually audit a stratified sample of at least 10 entries per collection against scans.
- [ ] Commit one source-controlled commit per collection, then `[jing] add: complete lot interaction` for shared UI.

## Task 9: Assemble all routes and complete release verification

**Files:** All Jingxin pages/components/styles; modify feature docs/indexes; conditionally create an ADR only after implementation evidence confirms the durable boundary.

**Why:** V1 must ship as one coherent private space, not a set of partially verified rooms.

**Change Necessity:** Route assembly and cross-route checks are required to prove shared privacy/theme/navigation contracts.

**Impact/Compatibility:** No deployment starts from the dirty main checkout. Rebase/merge the feature branch only after reviewing footer/index conflicts. Do not alter custom-domain or deprecated-address settings.

**Verification:** Run the full command suite, inspect bundle/network behavior, and verify live canonical routes after the existing push/deploy workflow reports success. Expected live URL prefix is `https://z.zz1031.workers.dev/jing/`.

- [ ] Extend E2E to visit all ten routes, test return/back-to-top/theme/reduced-motion/error states, block non-document network requests during private operations, and assert no public nav/comments/account/tracker elements in the Jing layout.
- [ ] Run `npm run test && npm run check && npm run build && npx playwright test`; resolve all failures without weakening assertions.
- [ ] Inspect `dist` for all routes, no `/jing/` sitemap entries, no plaintext fixture secrets, no external font/tracker URLs, and no oversized eager audio/image downloads.
- [ ] Update requirement/feature/Aegis indexes and implementation notes; record source versions, verification evidence, complexity closure, ADR decision, and any non-blocking residual risk.
- [ ] Commit `[jing] finish: verify hidden cultural study space`; then push/deploy through the existing verified workflow and perform read-only live smoke checks only after the platform reports success.

## Execution Readiness View

- Intent Lock: implement the approved complete V1; no reduction to a novelty page and no expansion into cloud accounts, AI chat, or payments.
- Scope Fence: ten hidden routes, local-only data, six figures, six ambience assets, three rule systems, three 100-lot collections, and complete acceptance.
- Baseline Lock: start from `fe8af72` in a dedicated feature worktree; preserve dirty main changes and reconcile only explicit footer/index seams.
- Approved Behavior: all behavior in requirements `003` and the approved design specification.
- Owner/Contract Constraints: pure domain modules, typed static data, local vault, scoped UI; no caller-side rule or storage fallback.
- Compatibility Boundary: public routes/services unchanged except the footer seal; sitemap exclusion and `noindex`; Worker target only.
- Retirement Boundary: no old Jingxin implementation exists; no compatibility adapter or temporary backend may survive.
- Task Batches: source gate; shell; vault; quiet rooms; Bazi; I Ching; Qimen; lots; final release.
- Test Obligations: RED before implementation, focused GREEN, then full unit/type/build/browser/privacy/integrity verification.
- Review Gates: source rights before assets/content; fixture verification before algorithms; footer conflict review before integration; all-green before deployment.
- Drift/Rewind Rules: if a source cannot be verified, stop that room; if an owner overlaps, return logic to the canonical module; if privacy network audit fails, stop release and remove the request path.
- Evidence Required Before Completion: command outputs, source ledger, golden fixtures, 300-lot report, sitemap scan, network audit, mobile screenshots, build output, deployment result, and live smoke.
- Advisory Boundary: execution guidance only; not authoritative completion or release permission beyond the approved target.

## Risks and controls

- **Source ambiguity:** use edition/checksum gates; never blend variants silently.
- **Algorithm disagreement:** expose school/rule versions and derivation; require golden fixtures and boundary warnings.
- **Privacy regression:** central vault, no direct storage in UI, browser network interception tests.
- **Bundle growth:** route-local controllers, lazy audio, responsive images, and build artifact inspection.
- **Cultural disrespect:** strict tradition ownership, sacred images not controls, neutral outcomes, no merit economy.
- **Dirty-worktree collision:** dedicated worktree and explicit footer/index reconciliation.
- **Content scale:** separate collection commits and automated completeness/prohibited-language scans.

## Retirement and rollback

- No legacy Jingxin path exists to retire.
- Each stage is independently revertible by its scoped commit before deployment.
- If release verification fails, keep the feature branch unpublished; do not add a proxy, fallback API, maintenance shell, or partial route as a workaround.
- If a shipped source or algorithm is later disproved, remove the affected room entry from the hall and publish a factual maintenance notice only after a scoped corrective plan; do not silently swap editions or rule sets.
- The footer seal and sitemap filter are the final integration seams and can be reverted without changing public content owners.

## ADR and baseline-sync signal

After successful implementation, evaluate an ADR for the dedicated Jingxin layout, local-only privacy contract, versioned calculation envelope, and source-ledger requirement. Update the architecture baseline only from verified implementation evidence, not from this plan alone.
