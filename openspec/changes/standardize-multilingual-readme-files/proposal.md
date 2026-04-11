---
change_type: implementation
priority: medium
dependencies: []
references:
  - README.md
  - README_ja.md
  - openspec/specs/documentation/spec.md
  - AGENTS.md
  - docs/requirements.md
---

# Standardize multilingual README files and language switch banner

**Change Type**: implementation

## Problem / Context

The repository already presents Hermes Agents WebApp as a 10-language UI, and the English README already includes a Conflux-style language-switch badge row. However, the documentation set is inconsistent:

1. The English README links to `README.ja.md`, but the existing Japanese file is named `README_ja.md`.
2. The language-switch banner implies other localized README files exist, but those files are not present.
3. The Japanese README uses a simple text switcher instead of the same Conflux-style badge UX.
4. The current naming scheme is inconsistent with the requested `README.{lang}.md` convention.

This creates broken links and an incomplete multilingual documentation experience for repository visitors.

## Proposed Solution

1. Standardize the README file naming scheme to `README.{lang}.md`, using `README.md` for English and `README.ja.md` for Japanese.
2. Promote the current Japanese README content into `README.ja.md` and stop using `README_ja.md` as the canonical path.
3. Add localized README files for all supported languages referenced by the application and banner:
   - `README.zh-CN.md`
   - `README.es.md`
   - `README.pt-BR.md`
   - `README.ko.md`
   - `README.fr.md`
   - `README.de.md`
   - `README.ru.md`
   - `README.vi.md`
4. Put the same Conflux-style shields.io language-switch banner at the top of every localized README, with working relative links to all 10 language variants.
5. Update README-internal cross references so they point to `README.ja.md` and the standardized localized filenames.

## Acceptance Criteria

- [ ] The repository root contains `README.md`, `README.ja.md`, `README.zh-CN.md`, `README.es.md`, `README.pt-BR.md`, `README.ko.md`, `README.fr.md`, `README.de.md`, `README.ru.md`, and `README.vi.md`.
- [ ] Every localized README starts with the same Conflux-style language-switch badge row and all badge links resolve to existing files.
- [ ] The Japanese README is standardized to `README.ja.md`, and README references no longer rely on `README_ja.md` as the canonical filename.
- [ ] The multilingual README set preserves the Hermes Agents WebApp project description and repository-specific links while exposing a consistent cross-language navigation experience.
- [ ] `python3 ~/.agents/skills/cflx-proposal/scripts/cflx.py validate standardize-multilingual-readme-files --strict` passes.

## Out of Scope

- Translating other documentation files beyond the README family
- Adding UI locale support beyond the already supported application languages
- Changing product behavior or application routing
