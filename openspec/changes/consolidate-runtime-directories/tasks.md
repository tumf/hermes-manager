## Implementation Tasks

- [ ] 1. パス定義の統一基盤を追加し、`runtime/` 基準の解決関数を導入する（verification: `src/lib` に runtime パス解決ユーティリティが追加され、`app/api/agents/route.ts`・`src/lib/db.ts`・`src/lib/globals-env.ts` が利用している）
- [ ] 2. Agents/Globals/DB/Logs の参照先を `runtime/` 配下へ移行する（verification: `rg "process\.cwd\(\).*(agents|globals|data|logs)" app src scripts` で旧直下パス参照が除去または移行互換層に限定される）
- [ ] 3. 既存環境向け移行処理を実装する（ディレクトリ移動、`agents.home` 更新、必要な launchd 再生成）（verification: 移行スクリプト/手順が `scripts/` と `docs/` に追加され、ドライランまたはテストで成功が確認できる）
- [ ] 4. launchd 生成と起動フローを新パス構成に合わせる（verification: `app/api/launchd/route.ts` と関連ユーティリティが `runtime` 配下パスを使い、start/status のテストが更新される）
- [ ] 5. ドキュメントと OpenSpec を更新し、構成・運用手順を一致させる（verification: `docs/requirements.md`・`docs/design.md`・該当 spec が `runtime/` 前提に更新される）
- [ ] 6. 回帰テストと主要操作確認を実施する（verification: `npm run typecheck`、関連 API/UI テスト、Agent start/stop の手動確認記録）

## Future Work

- `runtime/` の外部ストレージ化（NAS など）
- 環境ごとの runtime ルート切替（設定ファイル化）
