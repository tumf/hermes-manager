## MODIFIED Requirements

### Requirement: chat-tab-ui

エージェント詳細ページの Chat タブは、api_server の有効/無効に応じてストリーミングチャット UI またはガイダンスを表示する。

#### Scenario: api_server 無効時のガイダンスに global env が案内される

**Given**: api_server が無効のエージェント詳細ページ
**When**: Chat タブを開く
**Then**: ガイダンスに「global env (`/globals`) または agent の `.env` に `API_SERVER_ENABLED=true` を設定」と表示され、`/globals` ページへのリンクが含まれる
