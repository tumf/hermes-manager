## CHANGED Requirements

### Requirement: templates list page display axis

The Templates page groups templates by file type (AGENTS.md, SOUL.md, config.yaml) instead of by template name.

#### Scenario: templates page shows file-type cards

**Given**: Templates "default" and "research" exist, each containing AGENTS.md and config.yaml
**When**: The user navigates to the /templates page
**Then**: Two cards are displayed: "AGENTS.md" (listing "default", "research") and "config.yaml" (listing "default", "research")

#### Scenario: cards are expanded by default

**Given**: Templates exist for multiple file types
**When**: The /templates page loads
**Then**: All file-type cards are expanded (showing their template name lists)

#### Scenario: file-type card hidden when no templates

**Given**: No templates contain a SOUL.md file
**When**: The /templates page loads
**Then**: No "SOUL.md" card is displayed

#### Scenario: template names sorted alphabetically within card

**Given**: Templates "develop", "default", and "research" all contain AGENTS.md
**When**: The AGENTS.md card is displayed
**Then**: The template names are listed in order: "default", "develop", "research"

#### Scenario: edit a template file from file-type card

**Given**: The "AGENTS.md" card lists template "research"
**When**: The user clicks the edit button on the "research" row
**Then**: The edit dialog opens with the content of templates/research/AGENTS.md

#### Scenario: delete a template file from file-type card

**Given**: The "config.yaml" card lists template "default"
**When**: The user clicks the delete button on the "default" row and confirms
**Then**: The file templates/default/config.yaml is deleted and the card refreshes

## REMOVED Requirements

### Requirement: template-level bulk delete from list page

The "Delete template" button (which deleted all files in a template directory at once) is removed from the Templates list page. Individual file deletion remains available.
