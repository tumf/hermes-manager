## MODIFIED Requirements

### Requirement: Memory tab file display

Memory タブは `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md` を一度に1ファイルずつ表示し、SOUL については legacy direct-edit mode と partial-enabled source mode の両方を扱えるようにする。`AGENTS.md` は Memory タブで扱わない。ファイル切替ボタン、partial mode ガイダンス、確認ダイアログ、保存結果トーストなどの固定 UI 文言は有効な UI locale に応じてローカライズされなければならない。

#### Scenario: Memory file selector labels are localized

**Given** Memory タブを locale `ko` で表示している
**When** ファイル切替 UI を確認する
**Then** SOUL / MEMORY / USER の補助ラベルや関連ガイダンスは韓国語で表示される

#### Scenario: Partial-mode enable flow is localized

**Given** locale `fr` の Memory タブで partial mode が未有効である
**When** ユーザーが partial mode 有効化 UI を表示する
**Then** 有効化ボタン、説明文、完了トーストはフランス語で表示される
