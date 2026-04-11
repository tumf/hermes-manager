# UI localization design

## Overview

This change adds first-class localization to the Next.js webapp without changing the underlying agent/runtime data model. The goal is to make all operator-facing chrome translatable and switchable at runtime while preserving the current app structure.

## Goals

- Support these locales: `ja`, `en`, `zh-CN`, `es`, `pt-BR`, `vi`, `ko`, `ru`, `fr`, `de`
- Provide one shared locale source of truth
- Make the current page re-render in the selected language without a full application rewrite
- Persist locale selection across navigation / reloads
- Keep missing translations from breaking the UI

## Non-goals

- Translating user-authored content stored in runtime files
- Building a remote translation CMS
- Solving advanced pluralization for strings that do not currently need it

## Architecture

### 1. Locale source of truth

Introduce a shared i18n module that defines:

- supported locale ids
- default locale (`en` or `ja`, to be finalized during implementation but fixed centrally)
- human-readable language names for the selector
- validation / normalization helpers for stored locale values
- translation dictionary types so keys remain consistent across locales

All client components should resolve strings through this shared layer instead of inline literals.

### 2. Translation dictionaries

Keep dictionaries in-repo as versioned TypeScript or JSON modules. A typed base dictionary should define the canonical key shape; other locale dictionaries must implement the same structure.

Recommended grouping:

- `appShell`
- `agentsList`
- `agentDetail`
- `dialogs`
- `forms`
- `chat`
- `logs`
- `templates`
- `partials`
- `globals`
- `common`

This keeps keys discoverable and avoids one unbounded flat dictionary.

### 3. Locale state and persistence

Because the current app is mostly client-rendered, locale state can be introduced with a lightweight provider.

Candidate persistence order:

1. persisted user selection (localStorage and/or cookie)
2. default locale

Behavior:

- on app startup, read persisted locale
- normalize against the supported locale list
- if invalid/missing, use default locale
- expose current locale + setter through context/hook
- update `document.documentElement.lang` when locale changes

A cookie may also be written if later SSR-aware routing is desired, but route-prefix localization is not required for this change.

### 4. Shared language switcher

Place the switcher in `AppShell` so it is available from all routes, including desktop sidebar and mobile sheet/header contexts.

Requirements for the switcher:

- shows current language clearly
- lists all supported languages
- changing selection updates visible strings immediately
- works in both desktop and mobile navigation chrome

### 5. Fallback semantics

Two fallback classes are required:

1. invalid stored locale → fallback to default locale
2. missing translation key in a non-default locale → fallback to default-locale string

This prevents broken UI while implementation coverage is expanded.

### 6. Migration strategy

Migrate in slices rather than rewriting every component simultaneously.

Recommended order:

1. app shell and root metadata
2. top-level pages (`/`, `/globals`, `/templates`, `/partials`)
3. reusable dialogs / toasts
4. agent detail tabs and guidance copy
5. test coverage and missing-key cleanup

## Testing strategy

Add focused tests for:

- locale normalization and fallback helpers
- provider / hook behavior
- language switcher interaction
- representative component rendering in multiple locales
- persisted locale restoration
- `html[lang]` updates

Keep tests fast; avoid broad snapshot suites covering every locale on every component.

## Risks and mitigations

### Risk: mixed untranslated strings remain

Mitigation: migrate shared chrome and high-traffic workflows first, then use grep-based review to catch leftover literals.

### Risk: hydration mismatch around locale persistence

Mitigation: use a stable default render path and update locale in a controlled provider so components do not read browser-only APIs during SSR.

### Risk: translation key drift across locales

Mitigation: use typed dictionaries with one canonical schema and compile-time enforcement where possible.
