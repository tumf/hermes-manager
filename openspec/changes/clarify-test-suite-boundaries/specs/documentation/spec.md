## ADDED Requirements

### Requirement: Test suites have explicit execution boundaries

The repository MUST distinguish Vitest-driven tests from Playwright-driven browser tests so contributors can determine the expected runtime model and command for each test suite.

#### Scenario: Contributor identifies the correct runner for a test

**Given** a contributor is adding or reviewing a test in the repository
**When** they inspect the repository test layout and documentation
**Then** they can tell whether the test belongs to the Vitest suite or the Playwright suite without relying on tribal knowledge

#### Scenario: Default Vitest run excludes browser-only E2E tests by design

**Given** the repository contains a browser test that requires a pre-running application server
**When** a contributor runs the default Vitest command
**Then** that browser test is not implied to be part of the Vitest suite
**And** the repository documents the separate execution path for that browser test

## MODIFIED Requirements

### Requirement: contributing-exists

The repository root MUST describe developer workflows, including how different classes of tests are executed and maintained.

#### Scenario: Contributor reviews test commands before submitting changes

**Given** a contributor reads the repository documentation before changing tests
**When** they look for verification commands and test organization guidance
**Then** the documentation explains the intended boundary between Vitest and Playwright suites
**And** it identifies the command used for each suite
