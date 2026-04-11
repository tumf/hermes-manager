## Implementation Tasks

- [x] `src/components/chat-tab.tsx` の state/effect/render 責務を棚卸しし、分離後の hook / presentation component 境界を定義する（verification: manual - proposal と `docs/design.md` の Chat タブ責務に矛盾がないことを確認する）
- [x] characterization test を先に追加し、session 切替・送信・streaming・retry・mobile panel の既存 UX を固定する（verification: automated - `npm run test -- tests/components/chat-tab-characterization.test.tsx tests/components/chat-input.test.tsx tests/components/chat-messages.test.tsx tests/components/session-list.test.tsx`）
- [x] chat data flow と UI component の分離方針を spec に反映し、SSE parsing / optimistic update / effect dependency の回帰防止観点を明文化する（verification: manual - `openspec/changes/refactor-chat-tab-flow/specs/chat-tab-refactor/spec.md`）
- [x] strict validation を通す（verification: automated - `python3 /Users/tumf/.claude/skills/cflx-workflow/scripts/cflx.py validate refactor-chat-tab-flow --strict`）
- [x] `parseSseChunk` を `src/lib/parse-sse-chunk.ts` に純粋関数として切り出し、独立した unit test を追加する（verification: automated - `npm run test -- tests/lib/parse-sse-chunk.test.ts`）
- [x] `useChatFlow` hook を `src/hooks/use-chat-flow.ts` に作成し、session/message 取得・submit・SSE streaming・optimistic update・retry state を集約する（verification: automated - `npm run typecheck && npm run test -- tests/components/chat-tab-characterization.test.tsx`）
- [x] `src/components/chat-tab.tsx` を presentation-only に書き換え、hook から返る state と callback のみに依存させ、`eslint-disable react-hooks/exhaustive-deps` 抑制を排除する（verification: automated - `npm run lint`）

## Future Work

- Chat state を他の agent detail tab と共有できるよう hook の公開境界を再設計する
- streaming transport の詳細を reusable SSE utility に寄せる
