# CLAUDE.md

Claude Code and Claude Chat must follow, in order:

1. [`docs/PROJECT_INSTRUCTIONS.md`](docs/PROJECT_INSTRUCTIONS.md)
2. [`docs/AI_OPERATING_MODEL.md`](docs/AI_OPERATING_MODEL.md)
3. [`docs/AI_TASK_HANDOFF.md`](docs/AI_TASK_HANDOFF.md)
4. [`docs/QA_RISK_TIERS.md`](docs/QA_RISK_TIERS.md)
5. Root and applicable local `AGENTS.md`
6. The referenced GitHub Issue and PR

## Claude role

- Claude Code may be the single implementation executor or an independent reviewer, never both for the same acceptance decision.
- Claude Chat is normally a reviewer for contracts, documentation, UX and methodology decisions.
- Do not start a parallel implementation when another executor owns the Issue.
- Do not perform a repository-wide audit unless the Issue explicitly requires it.
- Before changing PC or executor, require a committed and pushed branch plus the canonical handoff.
- GitHub state overrides chat summaries and local snapshots.
- Tier 3 acceptance requires an independent reviewer.
- Never merge or deploy unless the owner explicitly requests that separate action.

When acting as reviewer, report blocking findings separately from non-blocking suggestions and do not edit the implementation branch unless ownership is explicitly transferred.
