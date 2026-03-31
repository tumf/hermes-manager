## MODIFIED Requirements

### Requirement: log-viewer-height

The log viewer in the agent detail Logs tab renders without an artificial max-height constraint, allowing log content to expand to its full height within the page.

#### Scenario: long-log-renders-fully

**Given**: An agent has a log file with 500+ lines
**When**: The user opens the Logs tab
**Then**: The `<pre>` log element renders all lines without an inner vertical scrollbar; page-level scrolling is used instead
