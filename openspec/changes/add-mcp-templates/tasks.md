## Implementation Tasks

- [ ] Add filesystem-backed MCP template helpers and validation for named `mcp_servers` fragments (verification: unit tests cover list/get/create/delete and invalid YAML rejection).
- [ ] Add MCP template CRUD API routes with zod validation and path traversal protection (verification: API tests or route-level tests confirm 200/400/404/409 behavior).
- [ ] Extend `src/components/agent-mcp-tab.tsx` with template load/apply, save-as-template, and delete actions without exposing unrelated `config.yaml` sections (verification: `tests/ui/agent-detail-page.test.tsx` covers MCP tab template workflows).
- [ ] Extend agent creation request handling and UI so the Add Agent dialog can optionally choose an MCP template (verification: dialog tests assert selected MCP template is submitted in `POST /api/agents`).
- [ ] Merge selected MCP template content into the new agent’s `config.yaml` during scaffolding while preserving normal SOUL/memory initialization (verification: tests confirm `mcp_servers` is present when selected and absent when not selected).
- [ ] Update `docs/requirements.md` and `docs/design.md` so MCP templates are documented as a provisioning and fleet-operations workflow (verification: manual review of docs/spec consistency).
- [ ] Add/extend tests for invalid MCP template YAML, MCP tab template apply/save/delete flows, and agent creation with MCP templates (verification: `npm run test`).
- [ ] Run `npm run test && npm run typecheck && npm run lint` after implementation (verification: all three commands succeed).

## Future Work

- Promote commonly used MCP templates into full provisioning presets
- Add import/export for MCP templates
- Add diff/preview before applying an MCP template to an existing agent
