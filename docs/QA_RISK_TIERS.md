# QA Risk Tiers

Этот документ уточняет применимость QA для multi-AI процесса и не заменяет `docs/PROJECT_INSTRUCTIONS.md`.

Risk tier определяется максимальными последствиями ошибки для production, данных, расчётов, решений, пользователей, безопасности и воспроизводимости, а не размером diff или количеством изменённых файлов. Risk tier задаёт минимальную глубину review и acceptance, но не заменяет применимые testing, deployment и production gates.

## Tier 1 — documentation / copy / non-runtime governance

Примеры: Markdown, Issue Forms, PR template, ссылки, текст без runtime effect.

Минимум:
- scope/diff review;
- `git diff --check`;
- link validation;
- YAML parse для Issue Forms;
- docs-only CI, если существует;
- smoke после merge для фактического появления templates.

Independent review рекомендуется для канонических governance документов и обязателен, если меняются quality/safety gates.

## Tier 2 — UI / export / user workflow

Минимум:
- lock-file install;
- typecheck/lint по применимости;
- unit и targeted browser tests;
- accessibility;
- Chromium/WebKit и mobile viewports;
- PDF/export regression по scope;
- manual UX acceptance при изменении взаимодействия.

## Tier 3 — production data / pipeline / aliases and classifier / methodology / calculations / architecture / deployment / security / reproducibility migrations

Tier 3 включает изменения, ошибка в которых может повлиять на production data, data pipeline, aliases/classifier, methodology, calculations, architecture, deployment, security или воспроизводимость исторических и текущих результатов.

Обязательно:
- полный применимый quality gate;
- независимый reviewer, не являющийся implementation executor;
- source/data/aggregate validation;
- formula/methodology and reproducibility checks по scope;
- artifact inspection;
- browser/e2e/accessibility/mobile;
- реальные устройства, когда scope затрагивает device-specific behavior;
- deployment и production evidence после merge.

Tier 3 нельзя принять только self-review или локальными тестами. Независимый review обязателен, но не отменяет применимые testing, artifact, deployment и production gates.

## Skipped checks

Для каждого skipped check PR фиксирует:
- название проверки;
- почему она неприменима;
- risk tier;
- кто подтвердил пропуск.

Tier 1 может подтвердить executor при объективном path-filter/documentation-only scope. Tier 2/3 требует reviewer или владельца соответствующего gate.

## Разделение статусов

Ни один уровень не позволяет объединять code, CI, review, merge, deployment и production в один статус. Green CI не означает merge; merge не означает deployment; deployment не означает production acceptance.
