## Implementation Tasks

- [ ] Update `src/components/code-editor.tsx` to expose current selection-aware text insertion for the active CodeMirror view (verification: component/API usage can target cursor insertion instead of append-only updates)
- [ ] Update `src/components/agent-file-editor.tsx` so `FileEditorHandle.insertText()` inserts at the current cursor or replaces the current selection while preserving dirty-state tracking (verification: UI tests exercise the handle through Memory tab interactions)
- [ ] Update `src/components/agent-memory-tab.tsx` so shared partial insertion uses `{{partial:<name>}}` without forced surrounding newlines (verification: partial insertion path no longer passes newline-wrapped text)
- [ ] Extend `tests/ui/agent-detail-page.test.tsx` to verify cursor-position insertion and selection replacement behavior for `Insert shared partial` (verification: `npm run test -- tests/ui/agent-detail-page.test.tsx`)
- [ ] Promote the memory-tab spec delta into canonical spec wording after implementation (verification: delta under `openspec/changes/fix-partial-insert-at-cursor/specs/memory-tab/spec.md` matches shipped behavior)

## Future Work

- Verify whether additional editor affordances (for example explicit insert-at-top/insert-at-bottom actions) are needed after real usage feedback
