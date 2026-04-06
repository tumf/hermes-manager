## Implementation Tasks

- [ ] `src/lib/gateway-discovery.ts` のポート解決順を `gateway_state.json -> meta.json -> .env` に更新し、暗黙の `8642` フォールバックを廃止する（verification: unit - `tests/lib/gateway-discovery.test.ts` に meta fallback / no-default-fallback を追加）
- [ ] `src/lib/agents.ts` が返す `apiServerPort` / `apiServerAvailable` を更新後の状態判定に追従させる（verification: integration - `tests/api/chat.test.ts` で resolved port を使うことを確認）
- [ ] `app/api/agents/[id]/chat/route.ts` の前提を更新し、ポート未確定時は upstream 接続せず 503 を返すことを明示する（verification: integration - `tests/api/chat.test.ts` に unavailable ケースを追加）
- [ ] `src/components/chat-tab.tsx` のガイダンスを自動割当・launchd 注入前提に更新する（verification: unit - 関連 UI テスト or snapshot で文言更新を確認）
- [ ] `docs/design.md` と必要な spec delta を実装方針に合わせて更新する（verification: manual - proposal/spec/design の記述整合を確認）
- [ ] `npm run test && npm run typecheck && npm run lint` を通す（verification: manual - 3 コマンド成功）

## Future Work

- gateway_state.json に常に `api_server_port` を書く Hermes 側の保証強化
- 既存 agent のポート修復 UI / diagnostics UI
