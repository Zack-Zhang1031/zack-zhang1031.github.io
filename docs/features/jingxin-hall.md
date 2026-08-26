# Jingxin Hall

## Overview

Jingxin Hall is a hidden, local-first traditional-culture study space reached through a small `静` seal in the public footer. It uses an independent immersive layout and divides each subject into a separately loaded Astro route.

## Design decisions

- The canonical route is `/jing/`; it is deliberately absent from public discovery surfaces and marked `noindex`.
- The public footer seal is an easter-egg entry, not a security boundary. Sensitive material is protected by optional local encryption rather than route obscurity.
- The hall uses static Astro pages with isolated client-side islands for interactive calculations, audio, randomness, and encrypted notes. It is not a client-routed SPA.
- Buddhist and Taoist content remain separate in presentation, sound, imagery, reverence flow, and lot collections.
- Spiritual interactions avoid points, achievements, guaranteed blessings, or sacred images as game controls.
- Interpretations expose rule sets and derivations and use bounded traditional language rather than deterministic high-stakes claims.
- All personal inputs and calculations are local and ephemeral by default. Only settings and encrypted notes persist.
- Audio is opt-in, lazy-loaded, instrumental or ambient only, and grouped by tradition.
- V1 includes all approved rooms but is implemented through seven independently verified stages before public deployment.

## Implementation notes

- Reuse the existing Astro build, theme conventions, route generation, and footer owner. Add a dedicated Jingxin layout and scoped components/data under a `jing` boundary instead of expanding `BaseLayout.astro` into a second application shell.
- Use Web Crypto with a versioned authenticated-encryption envelope for notes and exports. The derived key stays in memory for the unlocked session.
- Use `crypto.getRandomValues` for coin, lot, and cup randomness.
- Keep the 300 lot records and sacred-image attribution in typed, versioned static data files with validation tests.
- Keep calendar and divination rule sets as independent pure modules so the three Qimen schools and Bazi boundary options can be tested without rendering UI.
- Exclude Jingxin pages explicitly from sitemap generation and any local search index; route secrecy is not presented as access control.
- Do not add backend storage, Waline, Neon, Vercel APIs, Cloudflare data services, or third-party metaphysics APIs.
