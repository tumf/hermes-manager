## MODIFIED Requirements

### Requirement: chat-tab-viewport-usage

The agent detail Chat tab must maximize the visible message list area within the current viewport while preserving access to the session list and message input.

#### Scenario: desktop-chat-uses-available-height

**Given**: A user opens an agent detail page on a desktop-sized viewport
**When**: The user switches to the Chat tab
**Then**: The Chat layout expands to use the available viewport height beneath the page header and tab controls
**And**: The message list remains the primary scrollable region in the chat pane
**And**: The message input stays visible without requiring page scrolling in a typical viewport

#### Scenario: mobile-chat-keeps-input-reachable

**Given**: A user opens an agent detail page on a mobile-sized viewport
**When**: The user switches to the Chat tab
**Then**: The message list uses the remaining viewport height as efficiently as possible
**And**: The sessions overlay still works
**And**: The message input remains reachable without forcing the user to scroll the outer page in a typical viewport
