## Implementation Tasks

- [ ] Add a save-success callback path to `src/components/agent-file-editor.tsx` so parent views can react after a successful write without inferring from toast state (verification: unit/component wiring in `tests/ui/agent-detail-page.test.tsx`)
- [ ] Add a preview-only display mode to `src/components/agent-file-editor.tsx` that hides Save/unsaved/save-shortcut behaviors while keeping read-only rendering available (verification: `tests/ui/agent-detail-page.test.tsx` covers assembled preview controls)
- [ ] Update `src/components/agent-memory-tab.tsx` so saving `SOUL.src.md` refreshes or remounts the assembled `SOUL.md` preview only after successful save completion (verification: `tests/ui/agent-detail-page.test.tsx` covers same-screen preview refresh)
- [ ] Keep `/api/files` partial-mode assembler behavior unchanged while verifying the proposal relies on the existing `SOUL.src.md` → `SOUL.md` regeneration contract (verification: integration - existing or updated files API test coverage for `app/api/files/route.ts`)
- [ ] Add or update Memory tab UI tests to cover save-success preview sync, no-sync-on-failure behavior, and the absence of Save UI on `SOUL.md (assembled)` (verification: `npm run test -- tests/ui/agent-detail-page.test.tsx`)
- [ ] Promote the spec delta into canonical memory-tab and file-editor wording after implementation (verification: `openspec/changes/fix-memory-assembled-soul-preview/specs/` matches shipped behavior)

## Future Work

- Decide whether partial edits performed from `/partials` should push live preview refreshes into already-open agent detail pages
- Consider reusing preview-only viewer semantics for other read-only file surfaces if similar UX confusion appears elsewhere
