## Implementation Tasks

- [ ] Add tree traversal helpers in `app/agents/[name]/page.tsx` to collect descendant skill paths for the full tree and for individual folder nodes (verification: helper output is exercised by UI tests in `tests/ui/agent-detail-page.test.tsx` or a dedicated Skills tab test).
- [ ] Add top-level bulk action controls to `SkillsTab` in `app/agents/[name]/page.tsx` and wire them to existing skills link APIs while skipping no-op requests based on the current `equipped` set (verification: tests assert the controls render and trigger expected fetch calls).
- [ ] Add folder-level bulk action controls to `SkillTreeNode` in `app/agents/[name]/page.tsx` for expandable folder nodes and apply actions to all descendant skills regardless of expansion state (verification: tests assert a folder bulk action affects nested skills under that subtree).
- [ ] Add loading/disabled states so bulk actions do not conflict with per-skill toggles for affected paths and users receive success/error feedback consistent with the existing toast pattern (verification: tests assert disabled state during action and code review confirms toast handling stays consistent).
- [ ] Update UI tests under `tests/ui/agent-detail-page.test.tsx` or adjacent test files to match the current tree-based Skills UI and cover top-level and folder-level bulk actions (verification: `npm run test`).
- [ ] Run project verification after implementation (verification: `npm run test && npm run typecheck && npm run lint`).

## Future Work

- Consider a dedicated bulk skills API if large skill trees make many client-side requests noticeably slow.
