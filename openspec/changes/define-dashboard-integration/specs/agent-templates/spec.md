## ADDED Requirements

### Requirement: templates and partials remain first-class differentiators

Hermes Manager MUST continue to treat template-driven agent creation and shared partial-based SOUL composition as first-class product capabilities because they support provisioning and maintaining multiple distinct agents on one host.

#### Scenario: roadmap priorities are evaluated after upstream dashboard adoption

**Given** Hermes upstream provides an official dashboard for single-install management
**When** Hermes Manager priorities are reviewed
**Then** template selection, save-as-template flows, shared partial management, and partial-aware SOUL authoring remain core roadmap areas
**And** those capabilities are not deprioritized solely because upstream also manages generic single-agent configuration

### Requirement: provisioning features justify Hermes Manager product scope

Provisioning features in Hermes Manager MUST be framed as tools for creating, cloning, and evolving multiple managed agents with reusable identity and configuration assets.

#### Scenario: operator creates a new managed agent

**Given** reusable templates and shared partials exist
**When** the operator provisions another agent
**Then** the operator can compose that agent from reusable template and partial assets
**And** the workflow reinforces Hermes Manager as a multi-agent provisioning system rather than only a single-agent editor
