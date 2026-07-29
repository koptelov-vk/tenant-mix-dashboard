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
- automated Chromium/WebKit, mobile viewports, accessibility и e2e;
- automated PDF/export regression по scope;
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
- deployment и production evidence после merge.

Tier 3 нельзя принять только self-review или локальными тестами. Независимый review обязателен, но не отменяет применимые testing, artifact, deployment и production gates.

## Применимость физических устройств

Каноническая physical-device policy определена в `docs/PROJECT_INSTRUCTIONS.md`. Automated Chromium/WebKit, mobile viewports, accessibility, e2e, PDF и export являются основным QA-контуром, но не эквивалентны физическим устройствам или assistive technologies: Playwright WebKit не является physical iPhone Safari, Playwright Chromium не является physical Android Chrome, Android Emulator даёт emulator evidence, а не physical acceptance, и axe-core не является VoiceOver или TalkBack.

Physical Android не является стандартным merge или production gate. Physical testing выполняется только на iPhone 16 и запрашивается при серьёзном или критическом mobile defect, изменениях touch/focus/overlay/handoff interaction, keyboard/`visualViewport`/safe-area behavior, mobile PDF/export, конфликте Chromium и WebKit, воспроизведённом production defect либо по явному решению владельца.

Обычные UI, text, data, calculation и desktop-only изменения не требуют physical testing. Отсутствие physical evidence записывается как residual risk и не блокирует автоматически, если в Issue или принятом risk decision не был заранее определён явный physical gate.

## Skipped checks

Для каждого skipped check PR фиксирует:
- название проверки;
- почему она неприменима;
- risk tier;
- кто подтвердил пропуск.

Tier 1 может подтвердить executor при объективном path-filter/documentation-only scope. Tier 2/3 требует reviewer или владельца соответствующего gate.

## Разделение статусов

Ни один уровень не позволяет объединять code, CI, review, merge, deployment и production в один статус. Green CI не означает merge; merge не означает deployment; deployment не означает production acceptance.
