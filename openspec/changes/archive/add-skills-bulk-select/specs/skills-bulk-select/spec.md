## ADDED Requirements

### Requirement: Skills tab supports global bulk selection

The agent Skills tab MUST provide controls that allow the user to equip all available skills or unequip all currently equipped skills for the current agent from a single action.

#### Scenario: Select all available skills

**Given** the Skills tab has loaded a tree containing multiple skill nodes for an agent
**And** at least one available skill is not currently equipped
**When** the user activates the global select-all control
**Then** the UI equips every available descendant skill in the loaded tree for that agent
**And** the UI does not send equip requests for skills that are already equipped
**And** the UI indicates that the action is in progress until the requests complete

#### Scenario: Clear all equipped skills

**Given** the Skills tab has loaded a tree containing equipped skills for an agent
**When** the user activates the global clear-all control
**Then** the UI unequips every currently equipped skill in the loaded tree for that agent
**And** the UI does not send unequip requests for skills that are already unequipped
**And** the UI indicates that the action is in progress until the requests complete

### Requirement: Skills tab supports folder-scoped bulk selection

The agent Skills tab MUST provide folder-scoped controls on expandable folder rows so users can equip or unequip all descendant skills within a folder subtree.

#### Scenario: Select all skills in a folder subtree

**Given** the Skills tab has loaded a folder node with descendant skill nodes
**And** at least one descendant skill in that folder subtree is not currently equipped
**When** the user activates the folder select-all control for that folder
**Then** the UI equips every descendant skill in that folder subtree for the current agent
**And** the result is the same whether the folder is expanded or collapsed

#### Scenario: Clear all skills in a folder subtree

**Given** the Skills tab has loaded a folder node with equipped descendant skill nodes
**When** the user activates the folder clear-all control for that folder
**Then** the UI unequips every equipped descendant skill in that folder subtree for the current agent
**And** the result is the same whether the folder is expanded or collapsed

## MODIFIED Requirements

### Requirement: Skills tab supports per-skill selection

The agent Skills tab MUST continue to support equipping and unequipping individual skills while coexisting safely with bulk selection actions.

#### Scenario: Per-skill selection remains available after bulk controls are added

**Given** the Skills tab has loaded skills for an agent
**When** the user interacts with an individual skill checkbox
**Then** the UI equips or unequips only that selected skill using the existing skills links API behavior
**And** the checkbox is disabled while that skill is part of an in-progress action
