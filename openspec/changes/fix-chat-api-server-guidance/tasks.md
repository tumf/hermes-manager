## Implementation Tasks

- [ ] Task 1: Chat タブのガイダンス文言を修正 — `src/components/chat-tab.tsx` の api_server 未有効時メッセージを「global env (`/globals`) または agent の `.env` に `API_SERVER_ENABLED=true` を設定」に変更し、`/globals` ページへの内部リンクを追加する (verification: `npm run typecheck && npm run lint` が通過し、api_server 未有効エージェントの Chat タブで更新後のガイダンスが表示される)
- [ ] Task 2: typecheck / lint / test 通過確認 — `npm run typecheck && npm run lint && npm run test` が全て通過する (verification: コマンド実行で exit 0)

## Future Work

- `API_SERVER_KEY` による有効化も文言に含めるかの検討
- config.yaml の api_server 有効化を UI から操作できる機能
