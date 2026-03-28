# Add Restart Button

## Problem / Context

Hermes Agents WebApp では、エージェントの Stop / Start ボタンのみ提供されている。
エージェントを再起動したい場合、ユーザーは Stop → 状態確認 → Start と手動で 3 ステップを踏む必要がある。
ワンクリックで再起動できる Restart ボタンを Stop ボタンの横に追加し、運用効率を改善する。

## Proposed Solution

1. **API 拡張**: `/api/launchd` の `action` に `restart` を追加。内部で `launchctl stop` → 500ms wait → `launchctl start` を実行する。
2. **UI 追加**: Running 状態のエージェントに対し、Stop ボタンの横に Restart ボタンを表示する。対象箇所は 3 つ:
   - トップページ モバイルカード (`app/page.tsx`)
   - トップページ デスクトップテーブル (`app/page.tsx`)
   - 詳細ページ ヘッダー (`app/agents/[name]/page.tsx`)
3. **アイコン**: `RotateCcw` (lucide-react) を使用。ボタンスタイルは既存の Stop ボタンと統一 (`variant="outline"`, `size="sm"`)。

## Acceptance Criteria

- Running 状態のエージェントに Restart ボタンが Stop の右隣に表示される
- Stopped 状態では Restart ボタンは表示されない
- Restart クリックでエージェントが再起動され、成功時に toast 通知が出る
- 失敗時にエラー toast が出る
- 詳細ページでは操作中に Loader2 スピナーが表示される
- `docs/design.md` の API 設計が更新されている

## Out of Scope

- launchd の KeepAlive 設定変更
- Restart のリトライロジック
- Restart 中の進捗インジケーター（スピナー以上の表示）
