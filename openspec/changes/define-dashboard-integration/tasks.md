## Specification Tasks

- [ ] Add a product strategy delta that defines hermes-agents as the multi-agent control plane layered on top of Hermes rather than a competing general-purpose dashboard.
      Expected canonical result: the canonical UI and product specs state which responsibilities remain first-class in hermes-agents versus delegated to the upstream dashboard.
- [ ] Add roadmap guardrails for overlapping features including chat, sessions, logs, cron, skills, env/config, analytics, templates, and partials.
      Expected canonical result: future roadmap and proposal work can evaluate overlap against an explicit keep/adapt/defer policy.
- [ ] Validate the proposal after authoring the spec delta.
      Expected canonical result: `python3 /Users/tumf/.agents/skills/cflx-proposal/scripts/cflx.py validate define-dashboard-integration --strict` passes.

## Future Work

- Review existing roadmap/proposal documents and align them to the adopted dashboard integration policy.
- Decide later whether upstream deep-linking, iframe embedding, or shared navigation should be implemented.
