# Baseline governance

## Baseline roles

- Product requirements define user-visible scope, acceptance evidence, non-goals, and open decisions.
- Architecture boundaries define canonical owners, schemas, routes, compatibility, and retirement state.

## Alignment rules

- Correct a defective requirement before adapting implementation around it.
- When implementation drifts from an approved requirement, return to the approved baseline through the smallest stable change.
- Requirements and architecture documents remain authoritative; snapshots are supporting evidence.

## Review dimensions

Review ownership, module boundaries, contracts, dependency direction, retirement, compatibility, and net complexity after non-trivial work.

## Hard boundaries

- Do not change this governance file without explicit review.
- Do not treat plans or snapshots as completion evidence.
