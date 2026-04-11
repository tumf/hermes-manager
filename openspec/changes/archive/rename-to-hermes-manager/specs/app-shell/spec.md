## MODIFIED Requirements

### Requirement: Sidebar navigation with active state

アプリケーションの shared shell と locale-aware navigation は、製品名として `Hermes Manager` を正準表示しなければならない。shared app chrome、ページタイトル、または主要ヘッダーで旧名称 `Hermes Agents WebApp` を表示してはならない。

#### Scenario: Shared shell shows the renamed product

**Given**: オペレーターが任意のアプリケーションページを表示している
**When**: shared shell または主要ページヘッダーを見る
**Then**: 製品名は `Hermes Manager` として表示される
**And**: 旧名称 `Hermes Agents WebApp` は app chrome に表示されない
