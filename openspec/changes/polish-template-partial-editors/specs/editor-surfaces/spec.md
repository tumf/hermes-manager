## ADDED Requirements

### Requirement: Template and partial content editors use the shared long-form editing chrome

Templates and partials that are edited through modal dialogs must use the shared code editor surface with top-aligned primary actions and visible editor status metadata so the editing experience remains consistent with the Memory tab long-form editors.

#### Scenario: Create or edit a template file

**Given**: ユーザーが Templates ページで template file の作成または編集ダイアログを開いている
**When**: content フィールドが表示される
**Then**: content は shared code editor surface で編集できる
**And**: primary create/update action は editor 上部の操作領域から実行できる
**And**: line count と character count を含む editor status metadata が表示される

#### Scenario: Create or edit a partial

**Given**: ユーザーが Partials ページで partial の作成または編集ダイアログを開いている
**When**: content フィールドが表示される
**Then**: content は shared code editor surface で編集できる
**And**: primary create/update action は editor 上部の操作領域から実行できる
**And**: line count と character count を含む editor status metadata が表示される
