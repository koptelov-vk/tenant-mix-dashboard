# AI Task Handoff

Использовать при смене AI executor, reviewer или Windows-ПК. Handoff сохраняется в Issue или PR; локальный файл не является источником истины.

## Обязательный шаблон

```markdown
## Handoff
- Issue:
- PR:
- Previous executor:
- Next executor:
- Reviewer:
- Risk tier:
- Working PC: work / home
- Branch:
- Base SHA:
- Head SHA:
- Completed:
- Remaining:
- Tests run and results:
- CI runs:
- Blockers:
- Decisions that must not change:
- Files in scope:
- Files explicitly out of scope:
- Device requirements:
- Next exact action:
- Working tree: clean / not clean
- Branch pushed: yes / no
```

## Правила

1. Перед сменой ПК или executor все изменения committed и pushed; `working tree: clean` и exact head обязательны.
2. Если branch не pushed, handoff недействителен и работа не продолжается на другом ПК.
3. Next executor сначала проверяет GitHub base/head, Issue, PR, CI и handoff; не доверяет сохранённому локальному snapshot.
4. Completed описывает только фактически выполненное. Remaining содержит все незавершённые gates.
5. Не передавать секреты, токены, confidential data, локальные абсолютные пути или содержимое закрытых договоров.
6. Reviewer не становится executor без явного обновления Issue/PR и нового handoff.
7. При конфликте решений остановиться и запросить решение владельца.
