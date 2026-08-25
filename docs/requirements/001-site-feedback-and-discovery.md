# Site feedback and discovery

## Overview

Improve the reliability of comments, game discovery, game loading performance, blog browsing, and cooperation messaging.

## User Stories

- As a reader, I can see whether comments are available before writing one.
- As a reader, I can comment anonymously on an article using a relevant prompt.
- As a player, I can find controls and release information before opening a game.
- As a player, I can discuss a game on its detail page without comments cluttering the Games index.
- As a mobile reader, I can search and progressively reveal posts instead of scrolling through the full archive.

## Functional Reqs

- Comments appear only on article detail and game detail pages.
- The client checks Waline health before rendering the form and displays a visible error with retry when unavailable.
- Article and game comments use context-specific prompts.
- Anonymous comments are supported and comments enter moderation.
- The backend applies request frequency limits and spam filtering.
- Games cards show platform, status, controls, update date, and version.
- Demo videos are not requested until the user clicks play.
- Blog offers search, common series filters, more tags, and progressive loading.
- About states current cooperation availability.

## Non-Functional Reqs

- Comment failure must be perceivable without opening developer tools.
- The Games initial route must not request MP4 files.
- Poster assets should be web-optimized and responsive.
- Existing game and article URLs remain stable.

## Data Model

Game metadata is defined once in `src/data/games.ts` and consumed by the Games index and generated game detail pages.

## UI/UX

- The comment area displays checking, ready, or maintenance state.
- Games use poster-first media with an explicit play affordance.
- Mobile Blog initially shows eight posts; wider screens show twelve.

## API

- Waline health is checked with `GET /api/comment?path=<pathname>&pageSize=1`.
- Production Waline requires a durable database connection before comments can be enabled.

## Testing

- Run `npm run build`.
- Confirm Games HTML contains no video source URL outside the poster button data attribute.
- Confirm only article and game detail routes render the comments component.
- Test backend failure, retry, anonymous submission, moderation, and rate limiting after storage is connected.

## Open Questions

- Choose and provision durable Waline storage. Neon PostgreSQL through Vercel is the recommended default; a private GitHub data repository is the lightweight alternative.
- Turnstile can be added after Cloudflare site and secret keys are created.
