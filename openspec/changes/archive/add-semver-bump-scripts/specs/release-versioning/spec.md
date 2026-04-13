## ADDED Requirements

### Requirement: Repository exposes explicit SemVer bump commands

The repository MUST provide maintainer-facing commands for patch, minor, and major version bumps while keeping `package.json` as the canonical version source.

#### Scenario: Maintainer chooses the appropriate version increment

**Given** the repository is preparing a new release
**When** a maintainer inspects the available package scripts
**Then** they can run `bump-patch`, `bump-minor`, or `bump-major`
**And** each command corresponds to the expected SemVer increment level for `package.json`

#### Scenario: Version bump workflow stays lightweight

**Given** the repository only needs single-package release-number management
**When** a maintainer uses the provided bump commands
**Then** the workflow relies on npm-native version bump tooling
**And** the repository does not require a dedicated changelog or release-orchestration framework for this step

### Requirement: Repository documents the version bump workflow

Contributor-facing documentation MUST explain how maintainers should perform patch, minor, and major version bumps and how that step fits the repository's release process.

#### Scenario: Maintainer prepares a tagged release

**Given** a maintainer is following the documented release process
**When** they read the repository's versioning guidance
**Then** the documentation identifies `package.json` as the version source of truth
**And** it explains when to use `bump-patch`, `bump-minor`, and `bump-major`
**And** it describes any required clean-git-state expectation before running the bump command
