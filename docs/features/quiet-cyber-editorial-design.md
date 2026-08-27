# Quiet cyber editorial design

## Overview

The site uses a restrained editorial layout with a dark neutral palette, one signal-red accent, monospaced metadata, and lightweight interaction effects.

## Design decisions

- Keep the homepage identity-led and use large typography instead of decorative panels.
- Present Games as numbered records with platform, status, controls, update date, and version metadata.
- Limit ambient effects to sparse particles and pointer-local links; avoid autoplay media and animation libraries.
- Use a collapsible mobile navigation and stack dense records below 768px.
- Respect `prefers-reduced-motion` and keep tap targets at least 44 pixels tall.

## Implementation notes

The design is implemented in the shared layout and global stylesheet. Mobile devices render fewer background particles and do not calculate pointer links. Game videos remain poster-only until the visitor explicitly starts playback.
