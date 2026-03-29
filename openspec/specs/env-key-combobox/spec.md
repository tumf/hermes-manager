## Requirements

### Requirement: env-key-combobox-free-input

EnvKeyCombobox はサジェスト候補の選択と任意のキー名の自由入力を常に両立する。検索テキストが既知キーと完全一致しない限り、「Use "..."」オプションを候補リスト内に表示する。

#### Scenario: 候補に部分一致する文字列を入力して自由入力する

**Given**: EnvKeyCombobox のドロップダウンが開いている
**When**: ユーザーが "OPEN" と入力する（OPENROUTER_API_KEY 等が候補に残る）
**Then**: サジェスト候補とともに「Use "OPEN"」オプションがリスト内に表示される

#### Scenario: 候補に一切一致しない文字列を入力して自由入力する

**Given**: EnvKeyCombobox のドロップダウンが開いている
**When**: ユーザーが "MY_CUSTOM_KEY" と入力する
**Then**: 「Use "MY_CUSTOM_KEY"」オプションがリスト内に表示される

#### Scenario: 既知キーと完全一致する文字列を入力した場合

**Given**: EnvKeyCombobox のドロップダウンが開いている
**When**: ユーザーが "OPENROUTER_API_KEY" と入力する（既知キーと完全一致）
**Then**: 「Use "..."」オプションは表示されず、既知キーの候補のみ表示される

#### Scenario: 空文字の場合

**Given**: EnvKeyCombobox のドロップダウンが開いている
**When**: 検索テキストが空である
**Then**: 「Use "..."」オプションは表示されない

#### Scenario: 自由入力オプションを選択してキー名を確定する

**Given**: 「Use "TELEGRAM_BOT"」オプションが表示されている
**When**: ユーザーがそのオプションをクリックする
**Then**: "TELEGRAM_BOT" がキー名として確定され、ドロップダウンが閉じる
