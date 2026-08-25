# Game and blog discovery

## Overview

Games now expose practical release metadata and dedicated discussion pages. Blog browsing supports search, common series, additional tags, and progressive loading.

## Design decisions

- Store game metadata in one typed module to prevent index/detail drift.
- Use WebP posters and create the video element only after explicit interaction.
- Keep the first Blog view short: eight cards on mobile and twelve on larger screens.

## Implementation notes

Game detail routes are generated under `/games/details/<id>/` so they do not conflict with static playable builds under `/games/<id>/`. Blog filtering is client-side because the current archive is small enough to ship as static HTML.
