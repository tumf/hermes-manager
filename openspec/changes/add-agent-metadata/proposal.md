---
change_type: implementation
priority: high
dependencies: []
references:
  - src/lib/agents.ts
  - app/api/agents/copy/route.ts
  - docs/design.md
---

# Add Agent Metadata (name / description / tags)

**Change Type**: implementation

## Problem / Context

agentId は 7 桁ランダム文字列で、人間が識別しにくい。
複数エージェントを運用する際に、ユーザが視覚的に区別・分類できるメタデータが必要。

hermes-agent v0.6.0 の Profile 機能（PR #3681）から着想を得て、
本アプリ独自のエージェント管理メタデータを `meta.json` として導入する。

## Proposed Solution

各エージェントディレクトリに `meta.json` を新設し、ユーザ表示用のメタデータを格納する。

### `runtime/agents/{agentId}/meta.json`

```json
{
  "name": "本番 Telegram Bot",
  "description": "顧客対応用の日本語エージェント",
  "tags": ["production", "telegram", "customer-support"]
}
```

- 全フィールド任意。ファイル不在時のデフォルト: `{ name: "", description: "", tags: [] }`
- `agentId` は meta.json に含めない（ディレクトリ名がソース・オブ・トゥルース）

### Agent インターフェース拡張

```typescript
export interface Agent {
  agentId: string;
  home: string;
  label: string;
  enabled: boolean;
  name: string; // NEW
  description: string; // NEW
  tags: string[]; // NEW
  createdAt: Date;
  updatedAt: Date;
}
```

### Copy 時の挙動

`fs.cp` 後に meta.json の `name` を `"{元の name} (Copy)"` に書き換え。
`description` と `tags` はそのまま引き継ぐ。

### API

| エンドポイント              | 変更内容                                   |
| --------------------------- | ------------------------------------------ |
| `GET /api/agents`           | レスポンスに name/description/tags 追加    |
| `GET /api/agents/[id]`      | 同上                                       |
| `PUT /api/agents/[id]/meta` | name/description/tags を更新（新設）       |
| `POST /api/agents`          | name/description/tags をオプション受取     |
| `POST /api/agents/copy`     | コピー後に name を `(Copy)` 付きに書き換え |

### UI

- 一覧: name 表示（未設定時 agentId フォールバック）、tags バッジ
- 詳細ヘッダー: name / description / tags のインライン編集

## Acceptance Criteria

1. `meta.json` の読み書きが正しく動作する
2. meta.json 不在でもエラーにならずデフォルト値が返る
3. Agent 一覧・詳細で name が表示される（未設定時は agentId フォールバック）
4. tags がバッジとして一覧に表示される
5. 詳細ページから name / description / tags を編集・保存できる
6. エージェント新規作成時に name / description / tags を指定できる
7. Copy 時に name が `(Copy)` 付きになる
8. 既存エージェント（meta.json なし）が正常に動作する

## Out of Scope

- tags によるフィルタリング・検索（将来の別提案）
- アイコンや色の設定
- Export / Import 機能
