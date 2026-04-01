## Implementation Tasks

- [x] Task 1: api_server ポート発見ロジックの実装 (`src/lib/gateway-discovery.ts`) — gateway_state.json から PID を取得し api_server の LISTEN ポートを発見する関数、config.yaml に api_server が有効かを判定する関数を実装する (verification: `npm run test` で gateway-discovery のユニットテストが通る)
- [x] Task 2: GET /api/agents/[id] レスポンスに `apiServerAvailable: boolean` と `apiServerPort: number | null` を追加する。api_server 未有効 or gateway 未起動の場合は `apiServerAvailable: false` (verification: `curl /api/agents/{id}` で apiServerAvailable フィールドが返る)
- [x] Task 3: POST /api/agents/[id]/chat を SSE プロキシに改修 — `hermes chat -q` subprocess を廃止し、gateway の `POST /v1/chat/completions` (`stream: true`) に fetch でプロキシする。クライアント切断時に AbortController で abort。api_server 未有効時は 503 を返す (verification: `curl -N /api/agents/{id}/chat` で SSE チャンクが逐次返される)
- [x] Task 4: ChatTab コンポーネントの api_server 無効時ガイダンス表示 — apiServerAvailable が false の場合「Chat を使うには api_server プラットフォームを有効にし、gateway を再起動してください」と表示する (verification: api_server 未設定のエージェントで Chat タブにガイダンスが表示される)
- [x] Task 5: ChatTab ストリーミングチャット UI の実装 — 状態マシン (ready/submitted/streaming/error)、楽観的 UI、OpenAI 互換 SSE パース、assistant メッセージの差分更新 (verification: ストリーミング中にトークンが逐次表示される)
- [x] Task 6: Stop / Retry ボタンの実装 — streaming 中に Stop ボタン (AbortController)、error 時に Retry ボタン (最後の user メッセージ再送) (verification: Stop クリックでストリーミング中断、Retry で再送される)
- [x] Task 7: Textarea 入力 + Enter/Shift+Enter キーバインド — Input を textarea に変更、Enter で送信、Shift+Enter で改行、動的リサイズ (verification: Shift+Enter で改行、Enter で送信される)
- [x] Task 8: Markdown レンダリング — react-markdown をインストールし assistant 応答を Markdown レンダリングする (verification: コードブロック・リスト・リンク等が正しくレンダリングされる)
- [x] Task 9: 自動スクロール — 新メッセージ到着/ストリーミング中に最下部追従、ユーザーが上にスクロール中は追従停止 (verification: メッセージ追加時に自動スクロール、上スクロール時は追従停止)
- [x] Task 10: チャットエリアの高さ修正 — `max-h-[460px]` を flex-1 に変更してレスポンシブ対応 (verification: ブラウザリサイズ時にチャットエリアが追従する)
- [x] Task 11: セッション履歴統合 — 応答完了 (SSE `[DONE]`) 後にセッション一覧とメッセージ履歴を再取得する (verification: 応答完了後にセッション一覧が更新される)
- [x] Task 12: typecheck / lint / test 通過確認 — `npm run typecheck && npm run lint && npm run test` が全て通過する (verification: CI パイプラインと同等のチェックが通る)

## Future Work

- config.yaml の api_server 有効化を UI から操作できる機能
- Vercel AI SDK (`useChat`) への移行検討
- ファイル添付・マルチモーダル入力対応
- セッション名の自動生成（LLM タイトル生成）
