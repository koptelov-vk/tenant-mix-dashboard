# Claude Code result-routing format

This is a Claude Code tool-specific output convention. It does not reproduce,
replace, or override the authoritative multi-AI hierarchy defined in
[`docs/AI_OPERATING_MODEL.md`](AI_OPERATING_MODEL.md); it only governs how
Claude Code formats and routes the results it returns in chat.

All results on Tenant Mix Analytics must be returned not as a single general
report, but as a ready-made package for fast routing between the project's
standing chats. This applies to: development, code audit, testing, PR/CI
review, production acceptance, data/methodology, UX/UI, and corrective
workstreams.

## General rules

1. Do the task and verify facts first.
2. Never claim something is done when it has not actually been verified.
3. Keep these separate: confirmed fact; test/calculation result; conclusion;
   assumption; limitation.
4. State exact repository path, branch, base SHA, head SHA, main SHA, PR,
   workflow run, deployment ID, production SHA — whenever relevant.
5. Use `PHYSICAL_DEVICE_TESTING_OUT_OF_CURRENT_SCOPE` only as a declaration
   about the current task scope, not as a waiver of a risk-triggered mandatory
   physical QA gate. Determine applicability from the risk-based
   physical-device policies in [`docs/QA_RISK_TIERS.md`](QA_RISK_TIERS.md) and
   [`docs/PROJECT_INSTRUCTIONS.md`](PROJECT_INSTRUCTIONS.md). If those policies
   make physical QA mandatory for the task, report that gate as required or
   pending; do not label it out of scope.
6. Never post GitHub comments, merge, deploy, or close Issues without an
   explicit separate command.
7. Never use the word "done"/«готово» unless merge, deployment, or production
   are actually confirmed.
8. For a PR before merge, use: "PR prepared, merge and production not
   confirmed."
9. For an implementation without production verification, use: "Implemented
   in code, production not confirmed."

## Response format

First, give the full main report in plain Markdown, using this structure:

```
## Статус
Выполнено / частично / не выполнено / заблокировано.

## Environment
— ОС; repository path; branch; base SHA; head SHA; origin/main;
  версии Node/pnpm/Playwright и других значимых инструментов.

## Подтверждённые факты
Only facts with a source: code and line numbers; GitHub; CI; production;
test artifacts.

## Выполненные изменения
Files; systemic root cause; what changed; what did not change.

## Проверки
For each check: exact command; exit code; passed/failed/skipped; test count;
browser/viewport; evidence path.

## Найденные проблемы
Separately: confirmed defects; hypotheses; test gaps; unrelated findings.

## Ограничения
What was not verified; why; whether it affects the verdict;
physical-device applicability under rule 5 = OUT_OF_CURRENT_SCOPE or
required/pending under the referenced risk-based policies.

## Verdict
Exact machine-readable statuses.

## Следующее действие
Exactly one concrete action.
```

After the full report, always produce separate copy-ready blocks for each
required addressee, in this order: (1) full report, (2) the main target chat,
(3) QA — if tests or acceptance are involved, (4) execution control — if
status/blocker/critical path changes, (5) data/methodology or UX/UI — only
when the task touches those areas, (6) the next Claude Code command — if
continuation is required.

Each routed block:
- is preceded by a header line: `### Отправить в «ТОЧНОЕ НАЗВАНИЕ ЧАТА»`
- is a single fenced ```text``` code block
- is self-contained (no "see above", no references to other blocks)
- contains every exact SHA, PR/run/deployment number, and status the
  addressee needs
- is ready to copy and send with no further editing
- contains no internal reasoning
- does not mix roles or purposes from other addressees

Never put more than one target chat in the same code block.

### Per-chat content requirements

**«Tenant Mix — разработка и production»**: task and scope; root cause;
base/head SHA; branch and PR; changed files; implementation; local checks;
CI; risks; merge/deployment/production status; exactly one next action. Omit
a long QA protocol if the verdict and failing selectors suffice.

**«Tenant Mix — ошибки и QA»**: exact build/SHA; environment; browser/viewport
matrix; PASS/FAIL/AUTOMATION_LIMITATION; actual sizes/selectors;
reproduction steps; evidence paths; console/network; regression scope;
acceptance verdict; what needs re-verification. Omit implementation details
that don't affect testing.

**«Tenant Mix — контроль исполнения»**: Issue/PR; current status; CI status;
review status; merge status; deployment status; production acceptance;
blockers; unblocked/blocked tasks; critical-path changes; exactly one next
action. Never report an unconfirmed local claim as GitHub acceptance.

**«Tenant Mix — данные и методология»**: data source; verification date;
confirmed/estimated/conflicting/unknown; formulas; methodology/classifier
versions; data quality; impact on aggregates; required owner decisions.

**«Tenant Mix — UX/UI»**: the management question; affected screens;
desktop/mobile behavior; sizes; focus/keyboard/popover; accessibility;
visual risks; acceptance criteria.

## Machine-readable summary

At the end of the full response, add a separate JSON block:

```json
{
  "task": "",
  "status": "",
  "repository": "",
  "branch": "",
  "baseSha": "",
  "headSha": "",
  "mainSha": "",
  "issue": null,
  "pullRequest": null,
  "ci": { "status": "", "runs": [] },
  "merge": "",
  "deployment": "",
  "production": "",
  "verdict": "",
  "confirmedDefects": [],
  "automationLimitations": [],
  "nextAction": "",
  "evidencePaths": []
}
```

The JSON must be valid: double quotes; no comments; no trailing commas;
`null` for a missing number; never fill unknown fields with a guess.

## Three-way routing rule

When the request asks for a full review in «Tenant Mix — разработка и
production», a test verdict in «Tenant Mix — ошибки и QA», and a blocker
change in «Tenant Mix — контроль исполнения», the response must end with
exactly three separate blocks, in that order, each a full result — not a
short pointer back to the main report.

## Next-command rule

When continuation via Claude Code is required, after the routing blocks add:

`### Следующая команда для Claude Code` followed by one ```text``` block
containing the full command with context, scope, prohibitions, acceptance
criteria, and target addressee — ready to copy with no need to reconstruct
context from earlier messages.

## Final self-check before returning a result

- every required addressee got its own block
- every block is self-contained
- SHAs and numbers match across all blocks
- a local result is never called GitHub acceptance
- CI is never called PASS before all required jobs finish
- merge is never called deployment
- deployment is never called production acceptance
- physical-device applicability follows rule 5 and its referenced risk-based
  policies; a triggered mandatory gate is never labeled out of scope
- exactly one next step is stated
- every code block can be copied with no further editing
