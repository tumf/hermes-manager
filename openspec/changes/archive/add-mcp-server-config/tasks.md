## Implementation Tasks

- [x] Add MCP config read/write support in the agent file/config layer and API route so `mcp_servers` can be loaded, validated, merged, removed, and persisted without altering unrelated `config.yaml` keys.
      Expected repository evidence: `app/api/agents/[id]/mcp/route.ts` plus shared config helpers/tests covering valid save, invalid YAML rejection, and section removal.
- [x] Add an MCP editor UI to the agent detail Config workflow with upstream docs link and save behavior wired to the dedicated MCP API.
      Expected repository evidence: `app/agents/[id]/page.tsx` and/or new component files plus UI tests verifying load/save behavior.
- [x] Extend template handling so `config.yaml` templates and default content can include MCP examples safely, and document the workflow in requirements/design/OpenSpec.
      Expected repository evidence: updated `docs/requirements.md`, `docs/design.md`, OpenSpec spec deltas, and any template-related tests needed.
- [x] Verify the change with focused tests plus full project validation (`npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`).
      Expected repository evidence: passing test output and no regression in existing config/template flows.

## Acceptance #1 Failure Follow-up

- [x] Restore MCP UI tests in `tests/ui/agent-detail-page.test.tsx` covering: tab render with MCP fragment loading, save via dedicated API, and validation error display. Restore corresponding fixture support (`mcpContent`, `onMcpPut`, MCP route mock) in `tests/helpers/agent-detail-fixtures.ts`.

## Future Work

- Optional future UX for structured per-server forms, tool include/exclude chips, or connectivity diagnostics after the YAML-based workflow proves sufficient.
