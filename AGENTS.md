# MH Calculator: правила для агентов

Перед изменением проекта обязательно:

1. Прочитайте [каталог функций](docs/README.md), [правила проекта](docs/guidelines/README.md), [правила продуктовых контрактов](docs/guidelines/product-contracts.md) и постоянную спецификацию затрагиваемой функции приложения.
2. Считайте `docs/*-spec.md` контрактами текущего поведения. Если код и spec расходятся, сначала установите фактическое поведение и обновляйте их вместе.
3. Обновляйте существующий spec на функцию приложения. Не создавайте отдельный spec для вкладки, поля, режима, фильтра или одной задачи.
4. Создавайте новый spec только для новой самостоятельной функции со своим назначением и точкой входа.
5. При пользовательском изменении в том же коммите обновляйте соответствующий spec, [каталог функций](docs/README.md) и раздел `Unreleased` в [CHANGELOG](docs/CHANGELOG.md).
6. Не коммитьте `docs/superpowers/`, `.superpowers/`, brainstorming-заметки и implementation plans. Это временные локальные материалы, а не документация продукта; используйте в Markdown-пути явный маркер `brainstorm`, `plan` или `plans`, чтобы Git-index проверка могла их отклонить независимо от каталога.
7. Не удаляйте старый документ, пока все актуальные контракты не перенесены и ссылки не обновлены.
8. Перед версией, тегом или GitHub Release выполните [правила документации и релизов](docs/guidelines/documentation-and-releases.md).
9. При добавлении или переносе route, owner, public API или директории синхронно обновляйте каталог, соответствующий guideline и исполняемую проверку. Перед завершением запускайте `npm run docs:check` и `npm run architecture:check`.
10. Не возвращайте удалённые подходы по старому имени или пути. Файловый JSON import/export билдера не является продуктовой возможностью; JSON используется только как внутренний проверяемый server transport/persistence contract.
11. Не подменяйте и не заглушайте `console.error`/`console.warn` в тестах. Для намеренно ожидаемого вызова используйте общий точный одноразовый helper из `scripts/testing/consoleGuard.cjs`; остальные warning/error обязаны падать.
12. Полный Jest-gate запускайте через `npm run test:ci`: он измеряет production-код из `app` и `src` и защищает baseline по statements, branches, functions и lines. Не снижайте пороги и не расширяйте coverage-exclusions ради зелёного CI; изменение допускается только после документированного решения и повторного измерения полного набора тестов.
13. Не сохраняйте production-модули и публичные barrel-файлы «на будущее» без реального пути использования. `app/*` — точки входа Expo Router; остальные модули в `src/features` и `src/shared` должны быть достижимы от них по production import/re-export graph, что проверяет `npm run architecture:check`.
14. Production-код не должен импортировать файлы из `__tests__`, `testing`, `*.test.*` или `*.spec.*`: эти пути исключены из production-проверок и не могут служить runtime API или обходом архитектурных границ.
15. Negative/subprocess fixtures создавайте только в отдельном системном temp-каталоге и удаляйте целиком в `finally`. Не записывайте временные `.test.*` или production-файлы внутрь `app`, `src` и `scripts`: параллельный gate может подобрать их до cleanup.

Постоянные спецификации:

- [Божественность](docs/divinity-screen-spec.md)
- [Ветки героев](docs/divinity-talent-calculator-spec.md)
- [Билдер билдов](docs/divinity-branch-builder-spec.md)
- [Билды героев](docs/hero-builds-spec.md)
- [Антиквариат](docs/antique-rivalry-spec.md)
- [Призыв](docs/summon-rivalry-spec.md)
- [Еженедельное соперничество](docs/weekly-rivalry-spec.md)
