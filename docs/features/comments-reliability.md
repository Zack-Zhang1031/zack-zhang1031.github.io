# Comments reliability

## Overview

Waline is loaded only after a successful API health check. Unavailable service is shown as a maintenance message with a retry button.

## Design decisions

- Keep comments on detail pages where discussion has a clear subject.
- Allow anonymous comments with optional nickname and email.
- Disable image uploads and constrain comment length to reduce abuse surface.
- Use Neon PostgreSQL as durable storage and keep database credentials in Vercel Sensitive variables.
- Keep anonymous comments in `waiting` status until an administrator approves them.

## Implementation notes

The client config uses `login: 'disable'`, optional metadata, and a two-to-one-thousand character limit. The server sets `COMMENT_AUDIT=true`, `IPQPS=60`, and `SECURE_DOMAINS`. Waline's default Akismet integration remains enabled. The first site administrator registers through the Waline management UI and reviews queued comments there.
