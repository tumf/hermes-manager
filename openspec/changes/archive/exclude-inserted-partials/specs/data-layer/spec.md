## MODIFIED Requirements

### Requirement: shared-soul-partials-store

Shared SOUL partials must be stored in the filesystem under `runtime/partials/` and managed without a database. The partials API continues to report global `usedBy` relationships derived from scanning agent `SOUL.src.md` files, while per-agent insertion filtering remains a consumer-side concern.

#### Scenario: partial listing remains a global usage view

**Given**: `runtime/partials/secret-management.md` exists
**And**: `runtime/agents/alpha/SOUL.src.md` references `{{partial:secret-management}}`
**When**: `GET /api/partials` is called
**Then**: the response includes `secret-management`
**And**: the response includes `alpha` in the partial's `usedBy` set
**And**: the API does not remove `secret-management` only because another UI consumer may choose to hide already-inserted partials for its current agent context
