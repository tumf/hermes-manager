# Security Policy

## Supported Scope

Hermes Agents WebApp is designed for trusted-network / intranet operation.
It is not intended to be exposed directly to the public internet without an
additional authentication and access-control layer in front of it.

## Reporting a Vulnerability

Please report suspected vulnerabilities privately.

- Preferred contact: security@tumf.dev
- Include: affected version or commit, deployment model, reproduction steps,
  expected impact, and any relevant logs or screenshots
- Do not open a public GitHub issue for undisclosed vulnerabilities

We will acknowledge receipt as soon as practical and coordinate next steps
privately.

## Hardening Notes for Operators

If you run this project yourself:

- keep the app behind a trusted network boundary
- do not commit `.env` files, tokens, or secrets
- review `docs/requirements.md` and `docs/design.md` before changing the
  trust model
- use the provided validation and CI checks before deploying changes
