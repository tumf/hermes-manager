## MODIFIED Requirements

### Requirement: readme-exists

リポジトリルートの README 文書は、英語版 `README.md` を基点として、対応言語ごとの `README.{lang}.md` 命名規則で配置されなければならない。README 群は Conflux 風の言語切替バナーを各ファイル冒頭に備え、利用者が各言語版を相互に移動できるようにしなければならない。

#### Scenario: 利用者が README から別言語へ切り替える

**Given**: 利用者がリポジトリルートの任意の README 言語版を開いている
**When**: 冒頭の言語切替バナーを見る
**Then**: 英語、日本語、中国語簡体字、スペイン語、ポルトガル語（ブラジル）、韓国語、フランス語、ドイツ語、ロシア語、ベトナム語の README へのリンクが表示されている
**And**: 各リンク先はリポジトリ内に実在する `README.md` または `README.{lang}.md` ファイルである

#### Scenario: 日本語 README の正式ファイル名が統一されている

**Given**: リポジトリが多言語 README 命名規則を採用している
**When**: 利用者またはメンテナーが日本語 README を参照する
**Then**: 正式な日本語 README は `README.ja.md` である
**And**: README 群の内部リンクは `README_ja.md` ではなく `README.ja.md` を参照する
