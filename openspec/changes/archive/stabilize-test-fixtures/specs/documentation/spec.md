## ADDED Requirements

### Requirement: Test fixtures are isolated from shared machine state

Repository tests MUST avoid shared temporary paths and ambient machine-specific environment assumptions when equivalent isolated fixtures can be provided inside the test.

#### Scenario: Filesystem-backed test needs scratch space

**Given** a test writes temporary files or directories during execution
**When** the test creates its scratch workspace
**Then** it uses a unique test-local temporary directory rather than a fixed shared path
**And** cleanup of one test does not interfere with another test run

#### Scenario: Test depends on an environment-derived root path

**Given** a test exercises code that derives behavior from environment variables such as the current HOME directory
**When** the test establishes its fixture preconditions
**Then** it explicitly sets or stubs the required environment-derived root for that test
**And** the result does not depend on the machine user's ambient shell configuration

### Requirement: Browser tests prefer deterministic waits

Retained browser-driven tests MUST prefer waiting on observable application state over arbitrary time-based sleeps when a deterministic condition is available.

#### Scenario: Browser test waits for skills UI to become ready

**Given** a browser test opens a page whose content loads asynchronously
**When** the test waits for the page to become ready
**Then** it waits on a specific DOM or UI condition that reflects readiness
**And** it does not rely on a raw fixed sleep if an observable readiness signal exists
