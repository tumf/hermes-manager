---
change_type: implementation
priority: medium
dependencies: []
references:
  - app/layout.tsx
  - app/page.tsx
  - app/agents/[id]/page.tsx
  - src/components/app-shell.tsx
  - src/components/add-agent-dialog.tsx
  - src/components/chat-tab.tsx
  - src/components/agent-memory-tab.tsx
  - docs/requirements.md
  - docs/design.md
---

# Add UI localization and language switching

**Change Type**: implementation

## Problem / Context

The current webapp hard-codes a mix of English and Japanese UI copy across the app shell, list pages, dialogs, toasts, tabs, metadata, chat guidance, and memory editors.

- `app/layout.tsx` fixes `<html lang="ja">`, so the document language never reflects the user-selected locale
- navigation, page headings, buttons, dialogs, and toast messages are embedded directly in React components
- several screens already contain Japanese-only strings, while others are English-only, producing an inconsistent bilingual UI rather than a localizable product
- there is no user-facing way to switch languages or persist a locale preference across navigation / reloads
- the requested supported languages are Japanese, English, Simplified Chinese, Spanish, Portuguese (Brazil), Vietnamese, Korean, Russian, French, and German

Without first-class i18n support, the app cannot offer a consistent multilingual experience for operators using different languages.

## Proposed Solution

Add application-wide i18n infrastructure and a visible locale switcher for the webapp.

The change will:

1. Introduce a central locale configuration covering the supported locales: `ja`, `en`, `zh-CN`, `es`, `pt-BR`, `vi`, `ko`, `ru`, `fr`, and `de`.
2. Externalize existing user-facing UI strings from app shell, page titles, dialogs, tabs, empty states, validation messages, guidance copy, and toast notifications into locale dictionaries.
3. Add a language switcher in the shared app shell so users can change locale from any page.
4. Persist the selected locale across navigation and page reloads, and apply it to the document `lang` attribute.
5. Ensure the app renders a safe fallback locale when a translation key or stored locale is unavailable.
6. Update requirements, design, and specs so localization behavior is explicit, testable, and maintainable.

## Acceptance Criteria

- The webapp supports switching among `ja`, `en`, `zh-CN`, `es`, `pt-BR`, `vi`, `ko`, `ru`, `fr`, and `de` without code edits.
- A visible language selector is available from the shared layout and changing it updates all shared UI labels on the current page.
- The selected locale persists across navigation and full page reloads.
- The root document `lang` attribute reflects the effective locale.
- Existing page chrome and core flows (Agents list, agent detail tabs, memory/config/env/skills/chat/logs UI, templates/partials/globals pages, dialogs, and toasts) stop relying on hard-coded user-visible strings in component bodies.
- When a translation key is missing or a stored locale is invalid, the app falls back to the default locale rather than crashing.
- Tests cover locale resolution, language switching, fallback behavior, and representative localized rendering in shared UI.

## Out of Scope

- Translating agent-authored runtime content such as `SOUL.md`, memories, logs, chat transcript payloads, or template file contents created by users
- Server-side content negotiation from browser `Accept-Language`; explicit user selection is the primary control for this change
- Full pluralization / ICU message formatting beyond what is needed for the current UI strings
