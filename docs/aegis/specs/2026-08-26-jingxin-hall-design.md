# Jingxin Hall design specification

Date: `2026-08-26`
Status: `written for user review`

## 1. Goal

Create `静心堂`, a hidden, mobile-friendly, local-first cultural study space at `/jing/`. It should feel quiet and respectful while providing complete, inspectable traditional tools rather than shallow entertainment.

Success means all approved rooms work locally, the traditions stay separated, private data never leaves the browser, 300 lots pass integrity checks, calculation rules are traceable, and no unfinished route is deployed.

## 2. Approved scope

### 2.1 Routes

- `/jing/`: hall, introduction, daily quiet phrase, room entrances, privacy and sound status.
- `/jing/muyu/`: count, rhythm, elapsed time, pause, reset, keyboard and touch.
- `/jing/fo/`: Shakyamuni Buddha, Guanyin Bodhisattva, Ksitigarbha Bodhisattva, and guided reverence.
- `/jing/dao/`: the Three Pure Ones and guided reverence.
- `/jing/yixue/`: Five Elements, Bagua, and foundational study material.
- `/jing/bazi/`: Bazi calculation and bounded traditional interpretation.
- `/jing/yijing/`: five casting methods and derived-hexagram analysis.
- `/jing/qimen/`: chai-bu, zhi-run, and Maoshan calculations and comparison.
- `/jing/chouqian/`: separate Guanyin, Lu Zu, and Guan Di lot rooms with optional cups.
- `/jing/notes/`: encrypted local notes and import/export.

### 2.2 Content and interaction boundaries

- Buddhist and Taoist rooms, imagery, audio, rituals, and lots never merge.
- Sacred images provide context and focus but are not clickable game objects.
- Woodfish has no merit score, streak, rank, economy, achievement, or reward loop.
- Reverence ends with neutral acknowledgement, never a supernatural-success claim.
- No recited sutra, mantra, holy name, or baogao audio is shipped.
- Interpretations never state certain death, disease, disaster, pregnancy, crime, legal victory, or financial outcome.

### 2.3 Privacy boundary

- Birth details, locations, questions, casts, charts, and lot results remain in memory and clear on refresh unless the user explicitly copies an excerpt into notes.
- Persisted notes use a password-derived authenticated-encryption key. The password and plaintext never persist.
- There is no account, comment, analytics, tracking, cloud sync, external calculation API, or automatic location request.
- A hidden URL is discoverability control, not authentication. The interface must never imply otherwise.

## 3. Architecture

Use the existing Astro application and build each room as a static route with narrowly scoped client-side interactivity. The hall and reading content remain usable with minimal JavaScript; calculation, encryption, and audio code loads only where required.

Canonical owners:

- Public footer owns the single `静` entry.
- A dedicated Jingxin layout owns the immersive shell, metadata, theme, return controls, and common privacy affordances.
- Pure calculation modules own Bazi, I Ching, and each Qimen rule set.
- Typed static data owns figures, sources, reference content, and lot collections.
- A local vault module owns encryption envelope, import/export, lock timer, and storage access.
- Room components own presentation and user interaction, not calculation rules or persistence internals.

Dependency direction is room UI -> domain module/data -> browser primitive. Domain modules must not import Astro components or storage.

## 4. Data and rule contracts

### 4.1 Calendar and Bazi

- Supported Gregorian range: 1900-2100 inclusive.
- Month changes follow solar terms; year changes at Lichun.
- Legal civil time is the default.
- True solar time is optional and uses an explicit built-in city longitude or manual longitude; no geolocation.
- Late-Zi day turnover is an advanced option and is recorded in derivation output.
- Inputs close to a rule boundary receive a visible warning and show the effective rule choice.

### 4.2 I Ching

Support three coins, yarrow stalks, numeric casting, time casting, and manual six-line entry. Store each line's derivation and compute primary, changed, mutual, opposite, and reversed hexagrams from one canonical line model.

### 4.3 Qimen Dunjia

Chai-bu is the default Shijia method. Zhi-run and Maoshan are independent selectable rule sets. Each produces its own derivation; comparison displays differences without combining them into a synthetic result.

### 4.4 Lots

Guanyin, Lu Zu, and Guan Di collections each contain exactly 100 independently sourced and versioned entries. Each entry includes original text, allusion, traditional classification, newly written topic interpretations, cautions, source reference, and revision metadata.

Optional cups explain sheng, xiao, and yin outcomes. A cup result annotates the current lot but never destroys or silently redraws it. Repeated draws for the same stated question trigger a calm waiting reminder.

### 4.5 Local vault

The versioned export envelope contains KDF parameters, salt, IV, ciphertext, and authentication metadata. Use browser Web Crypto authenticated encryption and a memory-only unlocked key. Default idle lock is 15 minutes, configurable by the user. A failed import does not overwrite the current vault.

## 5. Visual and accessibility contract

- Light mode uses paper, pale ink, and vermilion; dark mode uses a night room, warm light, and subdued gold.
- Buddhist accents favor lotus, moon-white, and warm gold; Taoist accents favor pine, cloud, ink, and indigo.
- No neon magic circles, flashing, force feedback, autoplay, full-screen particles, or surprise audio.
- Mobile layouts are single-column. Wide charts scroll inside bounded containers; result sections collapse in a stable order.
- Every action is keyboard reachable, has a visible focus state and accessible name, and has a non-motion alternative.
- Respect `prefers-reduced-motion`; sound remains off until explicit activation and downloads lazily.

## 6. Error handling

The UI must surface invalid or unsupported dates, boundary ambiguity, denied storage, storage exhaustion, unsupported Web Crypto, wrong passwords, damaged files, incompatible formats, unavailable media, and calculation failures. Errors must preserve the user's current safe state and must not exist only in developer-console output.

## 7. Source and content integrity

- Sacred images require a public-domain or compatible-license source and visible attribution metadata.
- Ancient source text retains its edition/source record.
- Modern explanation is newly written or explicitly licensed; modern website commentary is not copied.
- Every rule engine and static collection exposes a content or algorithm version.
- Source verification is an implementation prerequisite for shipping the affected room, not a reason to fabricate missing material.

## 8. Delivery stages

1. Hidden shell, metadata exclusion, responsive theme, local encrypted notes.
2. Woodfish, opt-in sound, Buddhist room, Taoist room.
3. Yixue reference, calendar core, Bazi.
4. Five I Ching methods and derived hexagrams.
5. Three independent Qimen methods and comparison.
6. Three complete 100-lot collections, interpretation, and optional cups.
7. Full privacy, integrity, accessibility, mobile, performance, and build verification; deploy only after the complete V1 passes.

## 9. Acceptance evidence

- Astro production build succeeds with every route.
- Jingxin routes contain `noindex` and are absent from normal navigation, local search, and generated sitemap.
- A browser-network audit shows no personal input, note plaintext, or calculation payload leaving the browser.
- Unit tests cover date/rule boundaries, five casting methods, three Qimen methods, randomness adapters, vault round trips, and failure behavior.
- Automated validation proves each lot collection has exactly 100 unique sequential entries and complete required metadata.
- Manual checks cover representative mobile and desktop widths, light/dark themes, keyboard-only use, screen-reader labels, reduced motion, sound opt-in, and back-to-top controls.
- Licensed/public-domain image and text sources are recorded before deployment.

## 10. Non-goals

- No authentication, cloud backup, multi-device sync, comments, social sharing, rankings, gamified merit, payment, AI fortune-teller chat, professional-advice substitution, or third-party metaphysics service.
- No public navigation item or claim that the hidden route is access control.
- No change to the public site's canonical domain strategy or excluded custom-domain configuration.
- No publication of partial V1 rooms.

## 11. Design-governance record

### TaskIntentDraft

- Outcome: a complete hidden traditional-culture space with respectful interaction and inspectable local tools.
- Success evidence: build, privacy audit, algorithm tests, 300-lot integrity, source records, accessibility and mobile checks.
- Stop condition: complete V1 passes stage-seven verification and is ready for the approved deployment target.
- Non-goals: backend services, public discovery, deterministic high-stakes predictions, and sacred gamification.
- Primary risks: source accuracy, calendar/rule correctness, cultural mixing, privacy leakage, content scale, and mobile complexity.

### BaselineReadSetHint

- Existing Astro layout, footer, route, sitemap, theme, and local-search owners.
- Existing requirements/features indexes and Aegis baseline.
- Source references selected for calendar rules, Qimen schools, ancient lot texts, and image licensing.

### BaselineUsageDraft

- Required baseline refs: approved conversation decisions; `docs/aegis/baseline/2026-08-26-initial-baseline.md`; current Astro owners.
- Delivered context refs: user-approved route, privacy, content, interaction, visual, safety, and delivery sections.
- Acknowledged before plan refs: domain exclusion and preservation of unrelated dirty worktree changes.
- Cited in design refs: requirements and feature documents for Jingxin Hall.
- Missing refs: exact historical editions and implementation-time algorithm references.
- Decision: needs-verification before any affected content or algorithm ships; no product blocker remains.

### Requirement Ready Check

- Requirement source refs: approved conversation and `docs/requirements/003-jingxin-hall.md`.
- Goals and scope refs: sections 1-2 of this design.
- User/scenario refs: requirement user stories.
- Requirement item refs: route, interaction, data, privacy, accessibility, and delivery contracts.
- Acceptance refs: section 9.
- Open blocker questions: none for planning.
- Decision: ready.

### ImpactStatementDraft

- Affected layers: footer, isolated layout/routes, scoped styles/components, static data, browser-local domain modules, tests, sitemap/search configuration, and documentation.
- Owners: existing public footer for entry; new scoped Jingxin owners for all hidden-space behavior.
- Invariants: public navigation remains stable; Buddhist and Taoist data never merge; personal data never crosses the network; notes never persist plaintext.
- Compatibility: existing public routes and comments remain unchanged except for the footer seal.
- Non-goals: backend and custom-domain work.

### Existence Check

- Proposed new surface: a dedicated Jingxin layout, route subtree, domain modules, versioned lot data, and local vault.
- Existing reuse candidates: public BaseLayout, ordinary content posts, Waline/Neon, and one large client application.
- Why insufficient: the immersive shell, local-only privacy boundary, rule engines, and tradition-separated data have different ownership and loading requirements.
- Creation proof: dedicated owners prevent the public layout and comment/storage systems from absorbing unrelated sensitive functionality.
- Entropy impact: isolate by room and pure rule module; no parallel backend or SPA runtime; each owner remains independently testable.
- Decision: add-with-proof.

### Product Risk Lens

- Value: a distinctive personal study space that supports quiet practice and transparent traditional research.
- Non-goals: public acquisition, authoritative prophecy, or religious game economy.
- Trade-offs: complete V1 has high content-verification and algorithm-test cost; staged delivery controls risk without cutting approved scope.
- Decision: implement all seven stages, publish only after complete acceptance.

### Architecture Integrity Lens

- Invariant: ephemeral personal inputs stay local; tradition-specific content stays separate.
- Canonical owner: pure domain modules for calculations, typed static collections for sources, local vault for persistence, room UI for presentation.
- Responsibility overlap: prohibited between domain modules and UI/storage; prohibited between public comment/account infrastructure and Jingxin.
- Higher-level simplification: one shared line model for I Ching derivatives and one versioned crypto envelope for all notes/exports.
- Retirement/falsifier: no compatibility path is introduced; a proposed shared owner is rejected if it causes tradition mixing or network persistence.
- Verdict: coherent with isolated Astro routes.

### Complexity Budget

- Artifact class: high-complexity multi-route local web feature.
- Target artifacts: one scoped layout, room routes/components, pure domain modules, static datasets, tests, and documentation.
- Current pressure: low in the existing site, high in the proposed content and algorithms.
- Projected pressure: at-risk if implemented as one page or one script; within-budget when split by room/rule owner and loaded on demand.
- Planned governance: seven stage gates, pure modules, typed data validation, no backend, no SPA, no premature shared abstractions.
- Recommendation: add scoped owner files and split the implementation plan by verified stage.

## 12. ADR signal

The dedicated Jingxin layout, browser-local privacy boundary, pure calculation owners, and versioned data contracts are durable architecture decisions. After implementation evidence exists, decide whether to record them in an ADR and synchronize the architecture baseline. Do not mark an ADR accepted from this unimplemented design alone.
