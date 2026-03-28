# Add bulk select controls to Skills tab

## Problem / Context

The Skills tab currently renders the available skills as a hierarchical tree with per-skill checkboxes only. Agents with many available skills require repetitive one-by-one equip and unequip actions, which is slow and error-prone. The current UI also lacks a way to operate on an entire folder subtree even though the skill source is organized hierarchically.

## Proposed Solution

Add bulk action controls to the Skills tab in two places:

1. A top-level pair of controls to select all available skills or clear all equipped skills for the current agent.
2. A folder-level pair of controls on expandable folder rows to select all skills within that folder subtree or clear all equipped skills within that subtree.

The feature will reuse the existing skills links APIs without changing API contracts. The UI will compute descendant skill paths from the loaded tree and issue batched equip/unequip requests using the existing endpoints while skipping no-op operations for already-matching state.

## Acceptance Criteria

- The Skills card shows top-level bulk controls for selecting all available skills and clearing all equipped skills.
- Expandable folder rows show folder-scoped bulk controls for selecting or clearing every descendant skill in that subtree.
- Bulk actions operate on all descendant skill nodes regardless of current expand/collapse state.
- Bulk actions skip no-op requests for already-equipped or already-unequipped skills.
- The UI shows an in-progress state while a bulk action is running and prevents duplicate actions for the same affected skills.
- Existing single-skill checkbox behavior continues to work.
- UI tests cover top-level and folder-level bulk selection behavior.

## Out of Scope

- Changing skills API request/response formats
- Adding server-side bulk endpoints
- Reworking the skill tree data model
