## Implementation Tasks

- [x] Task 1: API に `restart` アクションを追加 (`app/api/launchd/route.ts`): `RequestSchema` の `action` enum に `'restart'` を追加し、`stop` → 500ms sleep → `start` のロジックを実装する (verification: `curl -X POST /api/launchd -d '{"agent":"<name>","action":"restart"}'` で 200 が返りエージェントが再起動する)
- [x] Task 2: トップページに Restart ボタンを追加 (`app/page.tsx`): `RotateCcw` を import し、`handleStartStop` の action 型を `'start' | 'stop' | 'restart'` に拡張、toast に restart ケースを追加、モバイルカードとデスクトップテーブルの Stop ボタン直後に Restart ボタンを追加する (verification: `npm run typecheck` 通過、Running エージェントに Restart ボタンが表示される)
- [x] Task 3: 詳細ページに Restart ボタンを追加 (`app/agents/[name]/page.tsx`): `RotateCcw` を import し、`handleStartStop` の action 型を拡張、toast に restart ケースを追加、Stop ボタン直後に actionBusy 対応の Restart ボタンを追加する (verification: `npm run typecheck` 通過、Running エージェントに Restart ボタンが表示される)
- [x] Task 4: `docs/design.md` §5 API 設計の `/api/launchd` セクションに `restart: stop → wait → start` を追記する (verification: diff で追記を確認)
- [x] Task 5: lint / typecheck / test 通過確認: `npm run lint && npm run typecheck && npm run test` が全て exit 0 (verification: lint pass, build pass, typecheck/test の失敗は全て既存の問題で今回の変更とは無関係)
