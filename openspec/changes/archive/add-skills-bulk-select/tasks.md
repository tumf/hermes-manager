## Implementation Tasks

- [x] Add tree traversal helpers in `src/components/skills-tab.tsx` to collect descendant skill paths for the full tree and for individual folder nodes (verification: helper output is exercised by UI tests in `tests/ui/skills-bulk-select.test.tsx`).
- [x] Add top-level bulk action controls to `SkillsTab` in `src/components/skills-tab.tsx` and wire them to existing skills link APIs while skipping no-op requests based on the current `equipped` set (verification: tests assert the controls render and trigger expected fetch calls).
- [x] Add folder-level bulk action controls to `SkillTreeNode` in `src/components/skills-tab.tsx` for expandable folder nodes and apply actions to all descendant skills regardless of expansion state (verification: tests assert a folder bulk action affects nested skills under that subtree).
- [x] Add loading/disabled states so bulk actions do not conflict with per-skill toggles for affected paths and users receive success/error feedback consistent with the existing toast pattern (verification: tests assert disabled state during action and code review confirms toast handling stays consistent).
- [x] Update UI tests under `tests/ui/skills-bulk-select.test.tsx` to cover tree traversal helpers, top-level and folder-level bulk actions, disabled state, and per-skill checkbox coexistence (verification: `npm run test`).
- [x] Run project verification after implementation (verification: `npm run test && npm run typecheck && npm run lint`).

## Future Work

- Consider a dedicated bulk skills API if large skill trees make many client-side requests noticeably slow.
