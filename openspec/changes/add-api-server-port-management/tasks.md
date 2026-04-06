## Implementation Tasks

- [ ] `meta.json` スキーマに `apiServerPort?: number` を追加する（verification: `src/lib/agents.ts` と関連型で `apiServerPort` を読み書きできる）
- [ ] ポート自動採番ユーティリティを追加する（verification: 使用中ポート集合から 8642〜8699 の最小空きポートを返す unit test を追加する）
- [ ] `POST /api/agents` で新規エージェント作成時に `apiServerPort` を採番して `meta.json` に保存する（verification: `tests/api/agents.test.ts` に meta.json へ port が保存されるケースを追加する）
- [ ] launchd plist 生成ロジックを更新し `API_SERVER_ENABLED` と `API_SERVER_PORT` を EnvironmentVariables に注入する（verification: `tests/api/launchd.test.ts` で生成 plist に両方の環境変数が含まれることを確認する）
- [ ] ポート枯渇時のエラーハンドリングを追加する（verification: 全ポート使用中の fixture で agent 作成が 409 または 422 を返す test を追加する）
- [ ] `docs/design.md` と必要なら `docs/requirements.md` を更新する（verification: launchd 実行モデルと meta.json の説明が proposal と一致する）
- [ ] `npm run test && npm run typecheck && npm run lint` を通す（verification: 3 コマンドが成功する）

## Future Work

- 既存エージェントの `.env` ベース `API_SERVER_PORT` を `meta.json` に移行する支援コマンド
- ポート再割当 UI / 修復 UI
