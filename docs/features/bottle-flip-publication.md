# Bottle Flip Publication

## Overview

The Bottle Flip 2D Web Desktop build is hosted at `/games/rengpingzi/` and is
listed alongside the existing games. Its index card uses the same poster-first,
click-to-load video pattern as the other entries and links to a generated detail
and comments page.

## Design Decisions

- Keep the playable Cocos build under `public/games/rengpingzi/` so relative
  engine asset URLs continue to resolve.
- Use a 1280 x 720 gameplay screenshot as the source poster and encode it as
  WebP for a small initial page payload.
- Publish a 960 x 540 H.264, fast-start MP4 demonstration so current desktop
  and mobile browsers can begin playback without downloading the full file.
- Describe both PC Web and mobile landscape support and list mouse, touch, and
  keyboard controls in the shared game metadata.

## Implementation Notes

The site entry is defined once in `src/data/games.ts`. The Games index and
`/games/details/rengpingzi/` route consume that record. Media lives at
`public/images/rengpingzi-1.webp` and `public/videos/rengpingzi-demo.mp4`.
The video remains poster-only until a visitor explicitly selects play.
