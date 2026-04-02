## MODIFIED Requirements

### Requirement: agent-detail-metadata-display

エージェント詳細ページの共通部（タブ上部）は、メタデータを読み取り専用で表示する。

#### Scenario: 共通部に name / description / tags が表示される

**Given**: エージェントの meta.json に `name: "本番Bot"`, `description: "顧客対応用"`, `tags: ["prod", "telegram"]` が設定されている
**When**: `/agents/:id` を表示する
**Then**: 共通部に name `"本番Bot"` とagentId、description テキスト、tags バッジが表示される
**And**: 共通部に編集フォーム（Input / Textarea / Save ボタン）は表示されない

#### Scenario: 未設定フィールドは非表示

**Given**: エージェントの meta.json に `name: ""`, `description: ""`, `tags: []` が設定されている
**When**: `/agents/:id` を表示する
**Then**: 共通部に description テキストと tags バッジは表示されない

### Requirement: agent-detail-metadata-tab

エージェント詳細ページに Metadata タブがあり、name / description / tags を編集できる。

#### Scenario: Metadata タブで編集・保存

**Given**: `/agents/:id` を表示し Metadata タブを選択している
**When**: name を `"新名前"` に変更して Save ボタンを押す
**Then**: `PUT /api/agents/:id/meta` が呼ばれ、保存成功後に共通部の name 表示が `"新名前"` に更新される

#### Scenario: デフォルトタブは Metadata

**Given**: ハッシュなしで `/agents/:id` を開く
**When**: ページが表示される
**Then**: Metadata タブがアクティブである

#### Scenario: ハッシュ指定で直接遷移

**Given**: `/agents/:id#metadata` にアクセスする
**When**: ページが表示される
**Then**: Metadata タブがアクティブである
