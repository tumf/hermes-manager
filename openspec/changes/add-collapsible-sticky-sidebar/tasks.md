## Implementation Tasks

- [x] Update `src/components/app-shell.tsx` to keep the desktop sidebar sticky while the main pane scrolls independently.
- [x] Add desktop collapse / expand controls, icon-only collapsed navigation behavior, and locale-aware accessible labels/tooltips.
- [x] Persist the desktop sidebar collapsed state across reloads without changing mobile sheet behavior.
- [x] Update `openspec/specs/app-shell/spec.md`, `docs/requirements.md`, and `docs/design.md` to describe the sticky + collapsible desktop shell behavior.
- [x] Add component tests covering sticky desktop shell navigation and collapsed-state persistence.
- [x] Run `npm run test && npm run typecheck && npm run lint`.

## Future Work

- Visual polish such as animated width transitions beyond the shared shell contract.
