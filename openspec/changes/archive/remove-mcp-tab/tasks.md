## Implementation Tasks

- [x] Remove the dedicated MCP tab from `app/agents/[id]/page.tsx` and update agent-detail UI tests to assert Config remains the MCP editing path.
      Expected repository evidence: `app/agents/[id]/page.tsx`, `tests/ui/agent-detail-page.test.tsx`, related fixtures.
- [x] Delete the dedicated MCP UI/API/template implementation and remove dead translation entries.
      Expected repository evidence: removed `src/components/agent-mcp-tab.tsx`, removed `app/api/agents/[id]/mcp/route.ts`, removed `app/api/mcp-templates/route.ts`, translation cleanup, and deleted/reworked related tests.
- [x] Update requirements, design, and spec deltas so MCP configuration is documented as part of `config.yaml` rather than a separate tab/API/template workflow.
      Expected repository evidence: `docs/requirements.md`, `docs/design.md`, `openspec/changes/remove-mcp-tab/specs/...`.
- [x] Verify with focused tests and full validation (`npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`).
      Expected repository evidence: passing command output and no agent-detail regression.

## Future Work

- If operators later need safer MCP ergonomics again, consider adding inline `config.yaml` guidance or linting rather than a second editor surface.

## Acceptance #2 Failure Follow-up

- [x] Delete the orphan `src/components/mcp-tab.tsx` (153 lines, exports `McpTab`). It is never imported anywhere in `app/`, `src/`, or `tests/`, and it still calls the removed `/api/agents/${name}/mcp` endpoint, so it would 404 if ever wired up. This is exactly the "dedicated MCP UI" the change promised to delete.
- [x] Delete `src/lib/agent-config.ts` (or strip it to only what is still used). `readAgentMcpConfigContent`, `writeAgentMcpConfigContent`, `readAgentConfig`, and `AgentConfigError` have zero non-test, non-self references after the MCP route removal — they are leftover helpers from the deleted MCP fragment endpoint. Remove the file (and any test file targeting it) so no orphan MCP-specific helpers remain.
- [x] After deleting the dead modules, re-run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` to confirm no consumer was missed and the working tree stays clean for archive.
