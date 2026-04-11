---
change_type: implementation
priority: low
dependencies: []
references:
  - app/templates/page.tsx
  - app/partials/page.tsx
  - src/components/agent-file-editor.tsx
  - src/components/code-editor.tsx
---

# Polish Template / Partial Editors

**Change Type**: implementation

## Problem / Context

The Memory editor surface places save actions at the top of the editor card and shows editor status metadata, which makes long-form editing comfortable. The Templates and Partials dialogs still use a textarea-focused layout with primary save actions only in the footer, so the interaction feels inconsistent and less efficient for markdown editing.

## Proposed Solution

Update the Templates and Partials create/edit dialogs to follow the same editing pattern as the Memory editor:

- keep the primary save action reachable near the top of the content editor area
- replace the plain textarea editing surface with the shared markdown/yaml CodeMirror editor where appropriate
- show editor status metadata such as line and character counts for the content field
- preserve the bounded dialog layout where only the intended editor/body region scrolls

## Acceptance Criteria

- Templates and Partials dialogs present their primary create/update action near the top editing chrome instead of only in the footer
- The Content field uses the shared editor surface rather than a plain textarea
- The editor surface shows the same status style used by the markdown file editor (for example line and character counts)
- Dialog layout remains usable on smaller viewports with stable header/footer regions
- Existing create/update flows continue to work

## Out of Scope

- Redesigning non-editor dialogs
- Changing template/partial API behavior
- Adding preview or split-view markdown rendering
