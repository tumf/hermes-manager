## Implementation Tasks

- [x] Define the supported locale set, default locale, locale labels, and fallback behavior in a shared i18n module (verification: inspect new locale config/utilities and confirm the supported locales include `ja`, `en`, `zh-CN`, `es`, `pt-BR`, `vi`, `ko`, `ru`, `fr`, `de`)
- [x] Introduce translation dictionaries / lookup helpers and migrate shared app-shell strings, metadata strings, navigation labels, page headings, dialog copy, tab labels, empty states, and toast messages away from hard-coded component literals (verification: inspect `app/layout.tsx`, `src/components/app-shell.tsx`, `app/page.tsx`, `app/templates/page.tsx`, `app/partials/page.tsx`, and representative agent-detail components for centralized translation lookups)
- [x] Add a visible language switcher to the shared shell and persist locale selection across navigation and reloads while updating the effective document language (verification: UI code shows the selector in shared chrome; tests or implementation evidence confirm stored locale reuse and `html[lang]` updates)
- [x] Localize representative high-traffic agent-detail experiences including add-agent dialog, metadata/memory/chat/logs guidance, and error/success toasts without regressing existing behavior (verification: inspect `src/components/add-agent-dialog.tsx`, `src/components/agent-memory-tab.tsx`, `src/components/chat-tab.tsx`, `src/components/agent-log-viewer.tsx`, and associated tests)
- [x] Update product requirements, design docs, and canonical specs to document multilingual UI behavior, locale persistence, fallback semantics, and switcher placement (verification: diff shows `docs/requirements.md`, `docs/design.md`, and affected `openspec/specs/*` updated consistently)
- [x] Validate the regression suite (verification: `npm run test && npm run typecheck && npm run lint`)

## Future Work

- Optional browser-language auto-detection / first-visit bootstrap from `Accept-Language`
- Locale-aware formatting for dates, times, and relative timestamps throughout session and cron views
- Translation workflow automation (linting for missing keys, extraction scripts, translator handoff docs)
