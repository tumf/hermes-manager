## ADDED Requirements

### Requirement: UI tests use shared helpers for repeated endpoint fixtures

The repository UI test suite MUST prefer shared test-only helpers when multiple test files exercise the same UI feature with substantially identical mock endpoint setup.

#### Scenario: Chat UI tests cover different behaviors on the same endpoint family

**Given** multiple UI tests exercise the same ChatTab feature area
**And** they require the same core mocked endpoints for agent metadata, sessions, and messages
**When** the tests are maintained over time
**Then** the common endpoint routing and render setup is defined in shared test helpers rather than reimplemented inline in each file
**And** each test file only overrides the behavior that is specific to its scenario

#### Scenario: Env tab tests vary only row state or mutation outcome

**Given** multiple UI tests exercise the same Env tab component with similar mocked API routes
**When** those tests are organized in the repository
**Then** they share common fixture builders for endpoint setup and default env rows
**And** the tests keep assertions focused on the user-visible behavior under variation

## MODIFIED Requirements

### Requirement: contributing-exists

The repository root MUST describe developer workflows, including maintainable testing practices for repeated fixture setup.

#### Scenario: Contributor adds a UI test with repeated fetch stubs

**Given** a contributor is adding a new UI test for an existing feature area
**When** they review repository testing conventions
**Then** the project guidance steers them toward shared test-only helpers for repeated fetch routing and setup rather than copying large inline fixture blocks
