## MODIFIED Requirements

### Requirement: Support legacy SOUL mode and partial mode

The system SHALL preserve direct `SOUL.md` editing for legacy agents and use `SOUL.src.md` plus assembly for partial mode agents. When `SOUL.md` is shown as the assembled view for a partial mode agent, that view SHALL be preview-only and SHALL NOT present save-oriented controls.

#### Scenario: Assembled SOUL view is preview-only in partial mode

- GIVEN agent `alpha` が `SOUL.src.md` を持つ
- AND UI が `SOUL.md` を assembled view として表示している
- WHEN ユーザーがその assembled view を確認する
- THEN assembled `SOUL.md` は read-only で表示される
- AND Save ボタンは表示されない
- AND unsaved 状態表示や保存ショートカット対象として扱われない
