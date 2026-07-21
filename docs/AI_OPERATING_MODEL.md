# Multi-AI Operating Model

## Назначение и источник истины

Этот документ определяет единый процесс совместной работы ChatGPT, Codex, Claude Code, Claude Chat, Cowork и человека на двух Windows-ПК.

GitHub является источником истины по фактическому состоянию: Issue, assignee/executor, branch, head SHA, PR, checks, review, merge SHA, deployment и production evidence. Сообщения в чатах и локальные заметки не изменяют статус без соответствующего GitHub evidence.

Этот документ является единственным authoritative source для multi-AI hierarchy, ролей, очередей, ownership и handoff process. Tool-specific entry points обязаны ссылаться на эту иерархию и не должны воспроизводить или переопределять её.

Каноническая иерархия:
1. `docs/PROJECT_INSTRUCTIONS.md` — продуктовые, data, methodology, QA, deployment и security gates.
2. Этот документ — authoritative multi-AI hierarchy: роли, очереди, распределение, ownership и процесс двух ПК.
3. `docs/AI_TASK_HANDOFF.md` и `docs/QA_RISK_TIERS.md` — специализированные контракты handoff и применимости QA, подчинённые первым двум уровням.
4. `AGENTS.md` и `CLAUDE.md` — tool-specific entry points, которые только направляют к authoritative hierarchy и не создают competing process.
5. Local `AGENTS.md` — только path-specific ограничения, которые не ослабляют канонические gates.

## Роли

- **Человек-владелец**: принимает решения по scope, executor, merge и production acceptance; разрешает конфликты.
- **ChatGPT**: intake, декомпозиция, маршрутизация, fresh status verification, acceptance coordination и управленческий вывод.
- **Codex**: основной implementation executor для подготовленных repository tasks на рабочем или домашнем Windows-ПК.
- **Claude Code**: implementation executor или independent technical reviewer, обычно доступен на домашнем ПК; не реализует ту же Issue параллельно с Codex.
- **Claude Chat**: независимый review документов, контрактов, UX и решений без скрытой реализации.
- **Cowork**: ограниченные research/document workflows с явно указанным scope и без замены GitHub evidence.

## Один executor

1. Одна Issue имеет одного implementation executor в каждый момент времени.
2. Другой AI может быть reviewer, но не ведёт параллельную реализацию той же Issue.
3. Смена executor требует handoff по `docs/AI_TASK_HANDOFF.md` и обновления Issue/PR.
4. Executor отвечает за branch, commits, tests и честный статус. Reviewer не исправляет код в той же ветке без явной передачи роли.

## Канонические очереди

Очередь — только инструмент планирования. Она не заменяет фактический статус GitHub Issue/PR, assignee, branch, head SHA, CI, review, merge, deployment или production evidence.

### NOW

- **Назначение:** готовые к реализации задачи с наивысшим подтверждённым приоритетом и без decision blockers.
- **Вход:** существует GitHub Issue; определены expected result, scope, acceptance, dependencies, risk tier и один executor; задача готова по данным и решениям.
- **Выход:** задача взята в работу, завершена, заблокирована решением, вытеснена P0/P1 production fast-path или явно переприоритизирована владельцем.
- **Кто меняет:** человек-владелец либо ChatGPT как координатор по прямому решению владельца, с отражением фактического состояния в GitHub.

### HOME / CLAUDE CODE

- **Назначение:** ресурсная очередь для задач, которым измеримо полезны Claude Code или домашний ПК; это не продуктовый приоритет.
- **Вход:** задача уже прошла priority/readiness/risk assessment; Claude Code или домашняя среда дают конкретную пользу по сложности, coverage, независимому review, объёму или доступным инструментам.
- **Выход:** задача назначена и начата, потеряла готовность, переведена в `DECISION BLOCKED`, вытеснена более приоритетной работой или стала безопаснее/быстрее для другого executor.
- **Кто меняет:** человек-владелец либо ChatGPT как координатор по прямому решению владельца; executor не повышает задачу только из-за доступности домашнего ПК или свободного лимита.

### DECISION BLOCKED

- **Назначение:** задачи, которым недостаёт продуктового, UX, data, methodology, security или architectural решения.
- **Вход:** отсутствует обязательное решение, source of truth, acceptance contract либо есть конфликт решений, не позволяющий безопасную implementation.
- **Выход:** blocker закрыт и зафиксирован в GitHub; Issue повторно проверена на readiness и затем направлена в `NOW` или ресурсную очередь.
- **Кто меняет:** человек-владелец или назначенный decision owner; implementation executor не снимает decision blocker самостоятельно.
- **Запрет:** `DECISION BLOCKED` не передаётся в implementation и не считается статусом выполнения вместо GitHub evidence.

## Выбор задачи и executor

Выбор выполняется строго в следующем порядке:

1. **P0/P1 и production impact:** сначала активные P0/P1 production defects и задачи с наибольшим подтверждённым влиянием.
2. **Readiness:** задача готова, обязательные решения приняты, dependencies закрыты, `DECISION BLOCKED` отсутствует.
3. **Risk tier:** учитываются последствия ошибки и требуемая независимость review/acceptance.
4. **Suitability:** соответствие задачи возможностям executor, инструментам и требуемому контексту.
5. **Branch and ownership:** один accountable executor, актуальные base/head, отсутствие параллельной реализации и конфликтующей ветки.
6. **Switching cost and limits:** стоимость передачи контекста, оставшийся объём и лимиты инструментов.
7. **Workstation availability:** доступность рабочего или домашнего ПК учитывается последней.

Доступность ПК не повышает менее приоритетную, неподготовленную или заблокированную задачу. Readiness всегда имеет приоритет над доступностью домашнего ПК.

Рекомендуемое соответствие:
- подготовка решений и acceptance contracts — ChatGPT / Claude Chat;
- обычная implementation и tests — Codex;
- сложный repository refactor или independent Tier 3 review — Claude Code;
- документационный independent review — Claude Chat;
- финальное решение и merge — человек-владелец.

## Лимиты и сложность инструмента

- Повышенные лимиты Claude Code или Cowork используются только при измеримой пользе: сокращение времени, повышение test/review coverage, снижение риска, независимость review либо обработка объёма, который другой инструмент не покрывает безопасно.
- Свободный лимит сам по себе не является основанием менять executor.
- Простые Tier 1/2 задачи не передаются более сложному инструменту без документированной причины.
- Нельзя передавать implementation другому AI только ради использования свободного лимита, если текущий executor может безопасно завершить задачу без контекстного риска.

## P0/P1 production fast-path

1. P0/P1 production defect имеет приоритет над обычными очередями и governance-задачами.
2. Задача назначается самому быстрому безопасному доступному executor с достаточными правами и контекстом.
3. Недоступность предпочтительного ПК или AI не задерживает containment и response.
4. Для немедленного containment допускается сокращённый handoff: Issue, branch/head, confirmed impact, containment action, tests/evidence, rollback и next owner.
5. Fast-path не отменяет evidence, rollback readiness, независимый review по риску, deployment checks и production verification.
6. После стабилизации восстанавливаются полный handoff, GitHub record, remaining gates и обычное разделение code/CI/review/merge/deployment/production.

## Два Windows-ПК

- Рабочий ПК: Codex и стандартные repository operations.
- Домашний ПК: Codex и Claude Code; Claude Code обычно доступен в будни после 18:00 и в выходные.
- Перед сменой ПК branch обязан быть committed и pushed.
- Нельзя продолжать с другого ПК по незакоммиченным файлам, скриншотам или устному описанию.
- На новом ПК сначала: fetch, checkout branch, verify head SHA, read Issue/PR и последний handoff, затем продолжение.

## Канонический workflow

1. Intake и проверка дублей.
2. Решение/contract и одна GitHub Issue.
3. Назначение executor и reviewer; указание risk tier.
4. Отдельная branch от актуального base.
5. Implementation только в scope.
6. Handoff при смене AI или ПК.
7. PR с Issue, executor/reviewer, risk, checks, missing gates и статусами.
8. CI и review.
9. Для Tier 3 — independent review.
10. Отдельное решение владельца о merge.
11. Merge SHA, затем deployment, затем production acceptance как разные стадии.
12. Закрытие Issue только после применимых acceptance criteria и evidence.

## Статусы

Всегда разделять:
- **Code**: not started / in progress / implemented.
- **CI**: not run / running / passed / failed.
- **Review**: not requested / pending / accepted / changes requested.
- **Merge**: not merged / merged + SHA.
- **Deployment**: not started / running / completed + deployment ID.
- **Production**: not checked / partially checked / accepted.

Фраза до merge: «PR подготовлен, слияние и production не подтверждены».

## Активные PR — датированный неавторитетный снимок

Следующая таблица зафиксирована на 2026-07-20 и служит только переходным контекстом. Она не является источником истины и не должна использоваться как current status без fresh проверки GitHub Issue, PR, head SHA, CI, review, merge, deployment и production evidence.

| PR | Issue | Executor record | Reviewer | Base / head | Risk | Completed | Missing gates | Device | Next action |
|---|---|---|---|---|---|---|---|---|---|
| #106 | #104 | GitHub author `koptelov-vk`; AI executor не записан | не назначен | `d55ff3d…` / `08fcb6c…` | Tier 3 | Legacy 160, Targeted 175, browser/accessibility 130/130 | real-device, final review, merge, deployment, production | iPhone Safari + Android Chrome | real-device acceptance |
| #105 | #99 | GitHub author `koptelov-vk`; AI executor не записан | не назначен | old base / `22a8fa2…` | Tier 2 | draft implementation | sync, fixtures, accessibility/PDF, fresh CI, production | mobile browser matrix | wait for accepted #104 |
| #97 | #88/#93 | GitHub author `koptelov-vk`; AI executor не записан | не назначен | stale base / `da41b5e…` | Tier 2 | stale draft only | recreate/rebase, geometry, CI, production | mobile geometry | wait for accepted #104 |

Для существующих PR отсутствие явного AI executor/reviewer является governance gap, а не основанием угадывать назначение. Следующее изменение каждого PR должно заполнить эти поля.

## Ruleset и labels

- Ruleset #58 не меняется в process PR.
- Required checks назначаются только после подтверждения, что стабильные check names появляются на каждом PR.
- Labels не переименовываются и не удаляются без отдельного решения.
- Новый label создаётся только после фактической проверки отсутствия эквивалента.
