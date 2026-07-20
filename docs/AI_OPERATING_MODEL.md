# Multi-AI Operating Model

## Назначение и источник истины

Этот документ определяет единый процесс совместной работы ChatGPT, Codex, Claude Code, Claude Chat, Cowork и человека на двух Windows-ПК.

GitHub является источником истины по фактическому состоянию: Issue, assignee/executor, branch, head SHA, PR, checks, review, merge SHA, deployment и production evidence. Сообщения в чатах и локальные заметки не изменяют статус без соответствующего GitHub evidence.

Каноническая иерархия:
1. `docs/PROJECT_INSTRUCTIONS.md` — продуктовые, data, methodology, QA, deployment и security gates.
2. Этот документ — роли, очереди, распределение и multi-AI процесс.
3. `AGENTS.md` и `CLAUDE.md` — tool-specific entry points без competing process.
4. Local `AGENTS.md` — только path-specific ограничения, которые не ослабляют канонические gates.

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

## Выбор executor и очередь

Выбор учитывает risk tier, тип задачи, контекст, доступные инструменты, лимиты, стоимость переключения, состояние branch и текущую доступность ПК. Доступность ПК влияет на очередь, но не является единственным критерием.

Рекомендуемый порядок:
- подготовка решений и acceptance contracts — ChatGPT / Claude Chat;
- обычная implementation и tests — Codex;
- сложный repository refactor или independent Tier 3 review — Claude Code;
- документационный independent review — Claude Chat;
- финальное решение и merge — человек-владелец.

Нельзя передавать implementation другому AI только ради использования свободного лимита, если текущий executor может безопасно завершить задачу без контекстного риска.

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

## Активные PR на момент перехода

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
