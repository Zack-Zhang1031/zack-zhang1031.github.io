# Comments reliability

## Overview

Waline is loaded only after a successful API health check. Unavailable service is shown as a maintenance message with a retry button.

## Design decisions

- Keep comments on detail pages where discussion has a clear subject.
- Allow anonymous comments with optional nickname and email.
- Disable image uploads and constrain comment length to reduce abuse surface.
- Treat database provisioning as a deployment prerequisite, not a hidden client error.

## Implementation notes

The client config uses `login: 'disable'`, optional metadata, and a two-to-one-thousand character limit. The server should set `COMMENT_AUDIT=true`, `IPQPS=60`, and `SECURE_DOMAINS` after durable storage is connected. Waline's default Akismet integration remains enabled.
