# Jingxin Hall

## Overview

Provide a private-interest, hidden cultural study space named `静心堂` at `/jing/`. It combines quiet practice, separately presented Buddhist and Taoist reverence content, traditional metaphysics research tools, three complete lot collections, and encrypted local notes. The 2026 visual rebuild keeps every local-first calculation and data contract while replacing the narrow content-site presentation with an immersive, scene-led desktop experience and a purpose-built mobile layout. The feature is educational and reflective; it must not promise supernatural outcomes or replace professional advice.

## User Stories

- As the site owner, I can enter Jingxin Hall through a subtle `静` seal in the public-site footer without adding it to normal navigation.
- As a mobile visitor, I can use the woodfish, reverence, charting, casting, and lot tools without horizontal layout breakage or unsolicited page-load playback.
- As a traditional-culture learner, I can see the rules and derivation behind a result instead of receiving an unexplained verdict.
- As a privacy-conscious user, I can calculate locally without sending birth details, questions, or notes to a server.
- As a private-note user, I can encrypt, export, import, lock, and clear my notes locally.
- As a returning visitor, I can enter a coherent night-courtyard hall, see lightweight local practice totals, and move between quiet practice, reverence, study, and private collection areas without encountering a dashboard-style UI.
- As a desktop visitor, I can use the core rooms comfortably at 1920×1080 and 1440×900 without every page becoming a long narrow article.
- As a mobile visitor, I get drawers, stacked panels, and intentional scene crops rather than a scaled-down desktop canvas.

## Functional Reqs

- Provide `/jing/` as a hidden hall with child routes for meditation, woodfish, Buddhist content, Taoist content, Yixue basics, Bazi, I Ching, Qimen Dunjia, lot drawing, and private notes.
- Use an immersive layout without the public navigation. Child pages provide `返回静心堂`; the hall provides a quiet `返回主页` action.
- Add one subtle `静` seal to the existing public footer as the only deliberate public entry.
- Keep all Jingxin routes out of the public navigation, site search, generated sitemap, and search-engine index.
- Keep Buddhist and Taoist content, imagery, audio, rituals, and lot collections separate.
- Include Shakyamuni Buddha, Guanyin Bodhisattva, and Ksitigarbha Bodhisattva in the Buddhist room.
- Include Yuanshi Tianzun, Lingbao Tianzun, Daode Tianzun, Lu Zu, and Guan Di in the Taoist room. Preserve and reuse existing local source imagery; do not regenerate sacred figures.
- Implement a meditation room with breathing, quiet sitting, countdown, optional ambience, and a reduced-motion path.
- Implement woodfish counting with count, average rhythm, elapsed duration, pause, reset, touch, click, keyboard input, optional auto-strike, local daily/cumulative merit records, and a short recent-strike chart. Merit is a private practice counter only; do not add rankings, streak rewards, loot, purchases, or supernatural claims.
- Build the woodfish room background in HTML/CSS rather than a full-scene image. Use transparent PNG object assets for a reddish 45-degree woodfish, mallet, incense burner, candle, and prayer beads; a strike advances through at least five visible code-controlled frames and preserves reduced-motion behavior. On desktop, keep statistics and controls as floating side overlays so they cannot displace the centered tabletop, woodfish, and strike button; on mobile, reorder the stage before collapsible data and controls.
- Implement guided reverence with selectable respectful gestures, slow 2D phases, neutral completion copy, local session records, and distinct Buddhist/Taoist movement names. Sacred images are never direct game buttons and remain visually static. Animate a separate foreground worshipper through transparent action frames, CSS presentation, and a typed state machine with explicit start, stop, completion, reduced-motion paths, and an accessible numbered progress state.
- Provide an interactive Five Elements relationship view plus Bagua reference material. Selecting an element highlights generation/restraint links and updates its correspondence panel. The relation, attribute, direction, season, color, and organ topic controls must each produce a visible selected state, status explanation, and matching correspondence highlight.
- Implement Bazi calculation for 1900-2100 using solar-term months and Lichun year turnover, with legal-time default, optional true solar time, optional late-Zi day turnover, and boundary warnings. Submission must expose computing, completion, and error status and move focus to the generated result instead of silently placing it below the fold.
- Implement I Ching casting through three coins, yarrow stalks, numbers, time, and manual line entry. Show primary, changed, mutual, opposite, and reversed hexagrams with derivations. Code-built coins must have an identifiable circular bronze form, square hole, and explicit `字面`/`背面`; empty number/time inputs must not be interpreted as zero.
- Implement separate Shijia Qimen calculations for chai-bu, zhi-run, and Maoshan rules, plus a comparison view. Submission must expose layer-progress/completion/error status and move focus to the generated comparison. Selecting any palace must visibly identify its same-number counterparts in the other schools and expose a narrow-screen-readable, same-palace structural comparison without adding fortune claims.
- Provide independent Guanyin, Lu Zu, and Guan Di collections of 100 lots each, including source/version metadata and completeness validation.
- Make divination cups optional within each lot room. Repeated redraws start immediately without a cooldown, while the in-memory session ledger keeps earlier results available for the current visit. Normal-motion drawing visibly progresses through shake, numbered-stick emergence, and paper unfurl; reduced motion reveals the same result immediately. Keep the optional question field visually above the action row and omit the former chant-highlight control.
- Build the lot-room background in HTML/CSS rather than a full-scene image. Guanyin, Lu Zu, and Guan Di each use a distinct sixteen-frame transparent PNG sequence derived from one stable visual direction per collection. Each sequence must keep its vessel, bundle, selected stick, and identifying ornament consistent across frames, reserve visible safety space above the highest stick, then carry the complete matching stick through initial stillness, shake left/right, emergence, airborne release, gravity-driven fall, one restrained table rebound, settled pause, and result reveal. Pre-decode the selected collection and coordinate the phases through one cancellable timeline. Advance complete frames near the cue boundary without cross-fading two selected-stick poses. Keep the selected stick visible on the altar table after reveal. Keep reproducible high-resolution and web-optimized outputs for all three collections.
- Keep the currently selected lot tube visible in the central shrine before the first interaction. Drawing animates that same visual, and completion returns it to a settled idle state instead of leaving the central stage empty.
- A single press of the draw button must start the ritual and automatically continue from the short first-visit cleansing prelude into shaking; it must not require a second click. The idle stick bundle appears inserted inside the tube, and the selected stick emerges from the center of the same opening.
- Use browser-local computation for all birth data, questions, casts, charts, and lots. Do not persist temporary inputs or results by default. An in-memory lot session ledger may retain at most eight draws until refresh.
- Allow an explicit result excerpt to be copied into encrypted private notes.
- Provide optional local password protection, automatic session locking, encrypted export, validated import, and local-data clearing.
- Preserve existing local note encryption envelopes and migration compatibility while presenting the room as `静心手札`.

## Non-Functional Reqs

- Treat all interpretations as traditional study and reflection, not guaranteed prediction.
- Do not make certain claims about death, disease, disaster, pregnancy, crime, legal outcomes, investment returns, or other high-stakes decisions.
- Show derivation, uncertainty language, and a real-world reminder near material conclusions.
- Do not use analytics, advertising, third-party tracking, cloud sync, automatic geolocation, external fonts, comments, accounts, likes, or sharing widgets.
- Sound controls default to enabled and remain user-toggleable; action audio is lazy-loaded by the triggering gesture and looping ambience still obeys browser autoplay policy. No sutra, mantra, holy-name, or baogao recitation audio is included.
- Map the stored 0–1 volume preference to perceptual gain at playback time. Foreground ritual sounds must use short attack/longer release ambience ducking, preserve headroom, and avoid abrupt loop-volume jumps. Source-recorded effects must have auditable attribution and checksums; project foley must not be labelled as field recording.
- Limit raster art to optimized local decorative scene backdrops where retained, licensed sacred source images, approved transparent worshipper action frames, and approved transparent woodfish/lot object frames. Build room structure, controls, diagrams, charts, coins, particles, timing, ritual state, and responsive states in HTML/CSS/SVG/TypeScript; above-the-fold imagery reserves layout space and must not introduce external requests.
- Use Web Crypto primitives for local note encryption; never persist the password or plaintext notes.
- Support current mobile and desktop browsers, keyboard operation, screen readers, sufficient contrast, and reduced-motion preferences.
- Use licensed or public-domain sacred imagery with visible source metadata.
- Keep modern explanations original; do not copy protected commentary from modern websites.
- Preserve the existing public-site navigation, comments, and canonical Worker deployment boundary outside the one footer seal.

## Data Model

- `JingSettings`: sound-enabled preference, volume, enabled ambience, motion preference, lock timeout, and dismissed introduction state.
- `EncryptedNotebook`: format version, KDF parameters, salt, IV, ciphertext, and authentication metadata; no password or plaintext fields.
- `LotCollection`: tradition, collection ID, title, source edition, content version, and exactly 100 `LotEntry` records.
- `LotEntry`: number, original text, historical allusion, traditional class, topic interpretations, cautions, source reference, and revision metadata.
- `CalculationResult`: in-memory-only input normalization, rule-set version, derivation steps, chart/cast output, interpretation, and warnings.
- `SacredFigure`: tradition, name, title, introduction, image attribution, license, and optional ambience group.
- `PracticeSummary`: browser-local date key, daily and cumulative woodfish counts, elapsed practice seconds, recent strike buckets, and optional reverence/meditation session summaries. No account identity or remote sync.

## UI/UX

- Use a refined Chinese 2D illustrated style built from dark timber, ink-black space, warm gold, parchment, bronze, candlelight, incense haze, cloud motifs, and restrained cinnabar. Avoid SaaS/dashboard visual language and cheap occult effects.
- Desktop rooms use a scene shell with left navigation or parameters, a central ritual/study stage, and right guidance/results where appropriate. The hall uses a persistent grouped left rail and scene-led entry cards.
- Mobile layouts use a compact top bar, horizontal/slide-out navigation, stacked or drawer panels, and intentional background crops. Controls remain at least 44px high.
- Use collapsible result sections on narrow screens ordered as input summary, chart, derivation, interpretation, and reminders.
- Allow wide charts to scroll inside their own container without widening the page.
- Present sound as enabled by default, but start action playback only from the corresponding user gesture and allow a persistent mute choice. Respect reduced motion and provide static alternatives for reverence, lot shaking, and divination cups.
- Show user-facing errors for invalid dates, solar-term boundaries, storage denial, insufficient local storage, failed decryption, damaged imports, and unsupported versions.
- Provide a right-side back-to-top control on each room without obscuring mobile content.
- Target the supplied final-reference composition at 1920×1080 and 1440×900 while retaining readable content below the initial viewport when the professional tools require more space.

## API

No remote application API is required. Calculations, randomness, encryption, and storage are browser-local. Built-in source data is versioned with the static site.

## Testing

- Unit-test calendar boundaries, Lichun turnover, solar-term month changes, true-solar-time correction, and late-Zi mode.
- Unit-test all five I Ching input methods and all derived hexagram relationships.
- Validate the three Qimen rule sets independently and test comparison output.
- Validate that each lot collection contains exactly the numbers 1-100 with no duplicates or cross-collection records.
- Test cryptographic round trips, wrong passwords, damaged files, incompatible versions, auto-lock, and storage-denied behavior.
- Test keyboard, touch, reduced motion, light/dark themes, and representative mobile widths.
- Add visual-structure assertions for the scene shell, grouped navigation, page-specific side panels, meditation route, interactive Five Elements states, and local practice summary.
- Build all Astro routes and verify Jingxin routes are absent from navigation, search data, and sitemap output and contain `noindex`.
- Verify no temporary personal inputs are written to local storage, logs, analytics, or network requests.

## Open Questions

- No blocking product questions remain for the visual rebuild. Exact historical editions and algorithm reference works remain governed by the shipped source ledger. Scene assets are decorative and must not be presented as historical documentation.
