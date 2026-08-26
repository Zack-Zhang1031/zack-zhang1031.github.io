# Jingxin Hall

## Overview

Add a private-interest, hidden cultural study space named `静心堂` at `/jing/`. It combines quiet interaction, separately presented Buddhist and Taoist reverence content, traditional metaphysics research tools, three complete lot collections, and encrypted local notes. The feature is educational and reflective; it must not promise supernatural outcomes or replace professional advice.

## User Stories

- As the site owner, I can enter Jingxin Hall through a subtle `静` seal in the public-site footer without adding it to normal navigation.
- As a mobile visitor, I can use the woodfish, reverence, charting, casting, and lot tools without horizontal layout breakage or automatic audio.
- As a traditional-culture learner, I can see the rules and derivation behind a result instead of receiving an unexplained verdict.
- As a privacy-conscious user, I can calculate locally without sending birth details, questions, or notes to a server.
- As a private-note user, I can encrypt, export, import, lock, and clear my notes locally.

## Functional Reqs

- Provide `/jing/` as a hidden hall with child routes for woodfish, Buddhist content, Taoist content, Yixue basics, Bazi, I Ching, Qimen Dunjia, lot drawing, and private notes.
- Use an immersive layout without the public navigation. Child pages provide `返回静心堂`; the hall provides a quiet `返回主页` action.
- Add one subtle `静` seal to the existing public footer as the only deliberate public entry.
- Keep all Jingxin routes out of the public navigation, site search, generated sitemap, and search-engine index.
- Keep Buddhist and Taoist content, imagery, audio, rituals, and lot collections separate.
- Include Shakyamuni Buddha, Guanyin Bodhisattva, and Ksitigarbha Bodhisattva in the Buddhist room.
- Include Yuanshi Tianzun, Lingbao Tianzun, and Daode Tianzun in the Taoist room.
- Implement woodfish counting with count, average rhythm, elapsed duration, pause, reset, touch, click, and keyboard input. Do not add merit points, rankings, streak rewards, or loot.
- Implement guided reverence through reading, a `合掌礼敬` action, three slow visual phases, and neutral completion copy. Sacred images are never direct game buttons.
- Provide Five Elements and Bagua reference material.
- Implement Bazi calculation for 1900-2100 using solar-term months and Lichun year turnover, with legal-time default, optional true solar time, optional late-Zi day turnover, and boundary warnings.
- Implement I Ching casting through three coins, yarrow stalks, numbers, time, and manual line entry. Show primary, changed, mutual, opposite, and reversed hexagrams with derivations.
- Implement separate Shijia Qimen calculations for chai-bu, zhi-run, and Maoshan rules, plus a comparison view.
- Provide independent Guanyin, Lu Zu, and Guan Di collections of 100 lots each, including source/version metadata and completeness validation.
- Make divination cups optional within each lot room. Repeated redraws receive a calm warning and never silently erase the original lot.
- Use browser-local computation for all birth data, questions, casts, charts, and lots. Do not persist temporary inputs or results by default.
- Allow an explicit result excerpt to be copied into encrypted private notes.
- Provide optional local password protection, automatic session locking, encrypted export, validated import, and local-data clearing.

## Non-Functional Reqs

- Treat all interpretations as traditional study and reflection, not guaranteed prediction.
- Do not make certain claims about death, disease, disaster, pregnancy, crime, legal outcomes, investment returns, or other high-stakes decisions.
- Show derivation, uncertainty language, and a real-world reminder near material conclusions.
- Do not use analytics, advertising, third-party tracking, cloud sync, automatic geolocation, external fonts, comments, accounts, likes, or sharing widgets.
- Audio is opt-in and lazy-loaded. No sutra, mantra, holy-name, or baogao recitation audio is included.
- Use Web Crypto primitives for local note encryption; never persist the password or plaintext notes.
- Support current mobile and desktop browsers, keyboard operation, screen readers, sufficient contrast, and reduced-motion preferences.
- Use licensed or public-domain sacred imagery with visible source metadata.
- Keep modern explanations original; do not copy protected commentary from modern websites.
- Preserve the existing public-site navigation, comments, and canonical Worker deployment boundary outside the one footer seal.

## Data Model

- `JingSettings`: theme, volume, enabled ambience, motion preference, lock timeout, and dismissed introduction state.
- `EncryptedNotebook`: format version, KDF parameters, salt, IV, ciphertext, and authentication metadata; no password or plaintext fields.
- `LotCollection`: tradition, collection ID, title, source edition, content version, and exactly 100 `LotEntry` records.
- `LotEntry`: number, original text, historical allusion, traditional class, topic interpretations, cautions, source reference, and revision metadata.
- `CalculationResult`: in-memory-only input normalization, rule-set version, derivation steps, chart/cast output, interpretation, and warnings.
- `SacredFigure`: tradition, name, title, introduction, image attribution, license, and optional ambience group.

## UI/UX

- Use a responsive ink-wash quiet-room style: paper, ink, and vermilion in light mode; night room, warm light, and subdued gold in dark mode.
- Use single-column mobile layouts and collapsible result sections ordered as input summary, chart, derivation, interpretation, and reminders.
- Allow wide charts to scroll inside their own container without widening the page.
- Keep sound off until a user gesture. Respect reduced motion and provide static alternatives for reverence, lot shaking, and divination cups.
- Show user-facing errors for invalid dates, solar-term boundaries, storage denial, insufficient local storage, failed decryption, damaged imports, and unsupported versions.
- Provide a right-side back-to-top control on each room without obscuring mobile content.

## API

No remote application API is required. Calculations, randomness, encryption, and storage are browser-local. Built-in source data is versioned with the static site.

## Testing

- Unit-test calendar boundaries, Lichun turnover, solar-term month changes, true-solar-time correction, and late-Zi mode.
- Unit-test all five I Ching input methods and all derived hexagram relationships.
- Validate the three Qimen rule sets independently and test comparison output.
- Validate that each lot collection contains exactly the numbers 1-100 with no duplicates or cross-collection records.
- Test cryptographic round trips, wrong passwords, damaged files, incompatible versions, auto-lock, and storage-denied behavior.
- Test keyboard, touch, reduced motion, light/dark themes, and representative mobile widths.
- Build all Astro routes and verify Jingxin routes are absent from navigation, search data, and sitemap output and contain `noindex`.
- Verify no temporary personal inputs are written to local storage, logs, analytics, or network requests.

## Open Questions

- No blocking product questions remain. Exact historical editions, image assets, and algorithm reference works require source verification during implementation and must be recorded in the shipped data metadata.
