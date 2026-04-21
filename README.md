# Hermes Manager

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Hermes Manager screenshot](./docs/images/ss-agents-1.png)

Hermes Manager is a Next.js control plane for operating many Hermes Agents together on a single host.
Unlike the official Hermes dashboard, which is a UI for managing a single Hermes installation, Hermes Manager is not a feature-parity replacement. It is positioned for multi-agent operations in trusted-network / intranet environments. It emphasizes agent provisioning, template/partial application, per-agent environment variable layering, local service control, and cross-agent management of settings, logs, and chat history.

Another core differentiator of this app is “partial prompt” operations, which let you maintain the SOUL of multiple agents using shared components. Each agent keeps a runtime-compatible deployed `SOUL.md`, while shared partials can be `embed/include`d from the editable `SOUL.src.md`. This lets you update common policies and operational conventions for multiple agents in one place while preserving only the role-specific differences per agent.

## Features

- A control plane for centralized operation of multiple agents on one host
- Fleet inventory visibility with tag filters and asynchronous service-status hydration
- A subagent operations platform that provides managed delegation / dispatch between agents
- Delegation target control, loop prevention, and maximum hop control through per-agent delegation policies
- Flexible operator-defined role models such as domain agents and specialist agents
- Reusable provisioning with templates / partials / memory assets
- SOUL composability that embeds shared partial prompts into multiple agents’ `SOUL.md`
- Automatic regeneration of assembled `SOUL.md` while maintaining Hermes runtime compatibility
- An operational model that separates per-agent differences from fleet-wide shared conventions
- Local service control integrated with launchd / systemd
- Cron job creation, editing, triggering, and output inspection
- Operator-focused UI improvements including a collapsible sidebar and stabilized chat layouts

### Managed Subagent Delegation

![Managed subagent delegation diagram](./docs/images/hermes-managed-subagent-delegation-org.png)

With Hermes Manager’s subagent features, you can build an operating model where agents collaborate by role instead of forcing each one to handle everything alone. In the diagram, business-domain agents such as Project A, Project B, and Client C serve as the front door for user requests, and delegate necessary work to specialist agents such as Python Developer, Marketing Analyzer, Web Designer, and Flutter Developer.

In this model, Hermes Manager does more than simply provide an entry point for agent-to-agent communication. It acts as a control plane where the operator can manage which specialists each agent is allowed to use and how many delegation hops are permitted. As a result, even as you add more business-domain agents, you can reuse specialist capabilities as shared resources while keeping fleet-wide behavior consistent.

The value of this feature is that the operator’s role design can be run safely through managed delegation and policy controls. Even if you increase the number of front-door agents, specialist agents remain easy to reuse, and delegation rules can be managed centrally, which makes real operational workflows built from multiple agents easier to maintain over time.

### Shared Partial Prompt / SOUL Composability

![Partial prompt diagram](./docs/images/hermes-partial-prompts.png)

In this setup, common partial prompts are managed as shared assets and `embed/include`d from multiple agents’ `SOUL.src.md` files to assemble the final `SOUL.md`. The operator can consolidate rules, safety policies, and host operation conventions shared by all agents into the partial side, while each agent only needs to define its role-specific differences. As a result, it reduces drift in shared instructions and makes fleet-wide SOUL maintenance more consistent.

## Documentation Map

- Requirements: [`docs/requirements.md`](./docs/requirements.md)
- Architecture / API design: [`docs/design.md`](./docs/design.md)
- Japanese README: [`README.ja.md`](./README.ja.md)
- Contribution guide: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Security reporting: [`SECURITY.md`](./SECURITY.md)
- User support: [`SUPPORT.md`](./SUPPORT.md)

## Overview

In Hermes Manager, you can perform the following operations from the browser UI.

- Centralized operation of multiple agents on one host
- Provisioning, duplicating, and deleting agents
- Start, stop, and restart via launchd (macOS) / systemd (Linux)
- Editing `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md`, `memories/USER.md`, `config.yaml`, and `.env`
- Managing agent metadata and fleet filtering through metadata tags
- Managing layered global / agent environment variables with visibility metadata
- Reusing templates / partials and copying skills from a local skill catalog into agent homes
- Inspecting local service control, logs, cron jobs, and chat sessions

## Safety / Trust Boundary

This project assumes operation on a trusted network / intranet.
It does not include public-internet authentication, multi-user privilege separation, or built-in defenses for public exposure by default.
If you operate it outside an intranet, make sure to add your own authentication and access-control layer in front of it.

## Screenshots

### Agents list

![Hermes Manager screenshot](./docs/images/ss-agents-1.png)

### Memory management

![Hermes Manager memory management screen](./docs/images/ss-agent_memory-1.png)

## Contributing

For the proposal flow, quality gates, and implementation prerequisites, see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## License

MIT. See [`LICENSE`](./LICENSE).
