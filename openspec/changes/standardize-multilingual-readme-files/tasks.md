## Implementation Tasks

- [ ] Create the multilingual README proposal delta under `openspec/changes/standardize-multilingual-readme-files/` (verification: `python3 ~/.agents/skills/cflx-proposal/scripts/cflx.py validate standardize-multilingual-readme-files --strict`).
- [ ] Standardize README naming to the `README.{lang}.md` convention, using `README.ja.md` for Japanese instead of `README_ja.md` (verification: repository root contains the expected filenames and README links reference `README.ja.md`).
- [ ] Add localized README files for all supported languages referenced by the README banner (verification: `README.zh-CN.md`, `README.es.md`, `README.pt-BR.md`, `README.ko.md`, `README.fr.md`, `README.de.md`, `README.ru.md`, and `README.vi.md` exist in the repository root).
- [ ] Add the same Conflux-style language-switch badge row to every localized README with working relative links (verification: each README begins with the full 10-language badge row and linked targets exist).
- [ ] Preserve Hermes Agents WebApp-specific content and repository links while aligning cross-language navigation (verification: localized README files retain project overview, setup, and repository document links rather than placeholder content).

## Future Work

- Extend the same multilingual file convention to other top-level docs such as QUICKSTART if the repository later adds multilingual quickstart guides.
- Add automated link validation for localized documentation if multilingual docs expand further.
