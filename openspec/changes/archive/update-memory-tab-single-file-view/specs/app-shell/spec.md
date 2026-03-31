## MODIFIED Requirements

### Requirement: Agent detail page scaffold with tabs

The app MUST include `app/agents/[name]/page.tsx` rendering tabs: Memory, Config, Env, Skills, Logs.
Within the Memory tab, file editing UI MUST show only one file editor at a time, and users MUST switch between `AGENTS.md` and `SOUL.md` using an explicit file selector.

#### Scenario: Memory tab shows one file editor at a time

**Given** a user navigates to `/agents/alice` and opens the Memory tab
**When** the page renders the memory editor area
**Then** only one editor is visible
**And** the visible editor corresponds to either `AGENTS.md` or `SOUL.md`, not both simultaneously.

#### Scenario: Switching files with unsaved changes requires confirmation

**Given** the user edits `AGENTS.md` in Memory tab without saving
**When** the user attempts to switch to `SOUL.md`
**Then** the UI asks for confirmation before discarding unsaved edits
**And** without confirmation, the current file remains selected.

#### Scenario: Save targets currently selected memory file

**Given** the user is editing `SOUL.md` in Memory tab
**When** the user clicks save
**Then** the client sends a save request for `path=SOUL.md` to `/api/files`
**And** no save request is sent for `AGENTS.md` in that action.
