## MODIFIED Requirements

### Requirement: chat-tab-ui

エージェント詳細ページの Chat タブは、api_server の有効/無効に応じてストリーミングチャット UI またはガイダンスを表示する。チャット入力まわりの固定 UI 文言、空状態、エラー表示、ガイダンス、操作ボタン、再送 UI は有効な UI locale に応じてローカライズされなければならない。

#### Scenario: Disabled guidance is localized

**Given** api_server が無効のエージェント詳細ページを locale `zh-CN` で開く
**When** Chat タブを開く
**Then** api_server 有効化と gateway 再起動を案内するメッセージは簡体中国語で表示される

#### Scenario: Retry/error UI is localized

**Given** locale `pt-BR` のチャット UI で送信エラーが発生した
**When** エラー表示と Retry ボタンが描画される
**Then** それらの UI 文言はポルトガル語（ブラジル）で表示される
