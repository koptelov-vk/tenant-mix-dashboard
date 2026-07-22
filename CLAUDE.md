# CLAUDE.md

Claude Code and Claude Chat must start with [`docs/AI_OPERATING_MODEL.md`](docs/AI_OPERATING_MODEL.md) and follow the authoritative multi-AI hierarchy defined there. This file is only a tool-specific entry point; it does not reproduce, replace or override that hierarchy.

Supporting references are linked by the authoritative hierarchy and by the active GitHub Issue/PR. Applicable local `AGENTS.md` files may add path-specific constraints but cannot weaken canonical gates.

When returning results, Claude Code additionally follows the tool-specific output format in [`docs/CLAUDE_CODE_RESULT_ROUTING.md`](docs/CLAUDE_CODE_RESULT_ROUTING.md); that format does not reproduce, replace or override the authoritative hierarchy above.

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
