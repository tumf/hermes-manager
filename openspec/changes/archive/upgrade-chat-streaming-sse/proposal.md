---
change_type: implementation
priority: high
dependencies: []
references:
  - openspec/specs/chat/spec.md
  - openspec/changes/archive/chat-feature/proposal.md
  - app/api/agents/[id]/chat/route.ts
  - src/components/chat-tab.tsx
  - gateway/platforms/api_server.py (hermes-agent repo)
---

# Upgrade Chat Tab to SSE Streaming via Gateway API

**Change Type**: implementation

## Problem / Context

現在の Chat タブは `hermes chat -q -Q` を subprocess で同期実行し、stdout を一括返却している。

調査の結果、以下が判明した:

- hermes CLI の `-Q` (quiet) モードは**ストリーミング出力しない**（全レスポンスをバッファリング後に一括出力）
- hermes gateway の `api_server` プラットフォームは **OpenAI 互換 SSE ストリーミング API** (`POST /v1/chat/completions` with `stream: true`) を既に実装済み
- 現在のエージェントには `api_server` プラットフォームが有効化されていない

現状の問題:

1. 応答完了まで最大 120 秒 UI がフリーズ（ストリーミングなし）
2. 楽観的 UI なし（送信後、全件再取得まで user メッセージすら表示されない）
3. Stop/Cancel 不可
4. エラーリカバリ手段なし（toast のみ）
5. Input が 1 行（textarea でない）
6. Markdown 未レンダリング
7. 自動スクロールなし
8. チャットエリアの固定高さ 460px

## Proposed Solution

`hermes chat` CLI subprocess を廃止し、hermes gateway の `api_server` プラットフォーム（OpenAI 互換 API）を経由するストリーミングチャットに刷新する。

### アーキテクチャ

```
Browser ──SSE──▶ Next.js API Route ──SSE proxy──▶ hermes gateway api_server
                 POST /api/agents/[id]/chat       POST /v1/chat/completions
                                                  (stream: true)
```

### api_server ポート発見

- gateway は `api_server` 有効時に動的に空きポートを確保する
- webapp は `gateway_state.json` またはエージェントの config.yaml 情報を元に api_server ポートを発見する
- ポート発見が不可能な場合（api_server 未有効 or gateway 未起動）は Chat を無効化

### Chat タブの有効/無効

| 状態                                             | 表示                                                                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| config.yaml に api_server なし or gateway 未起動 | ガイダンスメッセージ「Chat を使うには api_server プラットフォームを有効にし、gateway を再起動してください」 |
| api_server 有効 + gateway 起動中                 | ストリーミングチャット UI                                                                                   |

### フロントエンド刷新

| 項目           | 仕様                                                                  |
| -------------- | --------------------------------------------------------------------- |
| 状態マシン     | `ready → submitted → streaming → ready` + error                       |
| 楽観的 UI      | 送信即座に user メッセージ追加 + 空 assistant メッセージ              |
| ストリーミング | OpenAI 互換 SSE をパースし assistant メッセージを差分更新             |
| Stop           | streaming 中に表示。AbortController で接続切断                        |
| Retry          | error 時に Retry ボタン → 最後の user メッセージ再送                  |
| Textarea       | 複数行入力。Enter 送信 / Shift+Enter 改行                             |
| 自動スクロール | 新メッセージ + ストリーム中に最下部追従。ユーザー上スクロール中は停止 |
| Markdown       | react-markdown で assistant 応答をレンダリング                        |
| 高さ           | flex-1 で親コンテナに追従                                             |

### セッション履歴との統合

- セッション一覧・メッセージ履歴表示（左ペイン）は現状維持（state.db 読み取り）
- 新規チャット送信は gateway API 経由
- 応答完了後にセッション一覧とメッセージ履歴を再取得

## Acceptance Criteria

1. api_server が有効かつ gateway 起動中のエージェントで、Chat タブにストリーミングチャット UI が表示される
2. api_server が無効のエージェントで、Chat タブに有効化ガイダンスが表示される
3. メッセージ送信後、トークンが逐次表示される（ストリーミング）
4. ストリーミング中に Stop ボタンで中断できる
5. エラー時に Retry ボタンで再送できる
6. 入力は textarea で複数行対応（Enter 送信 / Shift+Enter 改行）
7. assistant 応答が Markdown レンダリングされる
8. 新メッセージ到着 / ストリーミング中に自動スクロールされる
9. セッション一覧・履歴は引き続き state.db から表示される
10. 応答完了後にセッション一覧が更新される

## Out of Scope

- config.yaml の api_server 自動有効化 UI（ユーザーが手動設定）
- Vercel AI SDK (`useChat`) 採用（自前 EventSource でシンプルに実装）
- ファイル添付・マルチモーダル入力
- メッセージの編集・削除
- 会話履歴（history）の gateway への送信（単発メッセージ送信のみ。セッション継続は gateway 側で管理）
