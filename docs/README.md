# Документация MH Calculator

В репозитории ведётся один живой spec на самостоятельную функцию приложения. Вкладки, режимы и небольшие улучшения обновляют родительский документ и не создают новые постоянные specs.

## Что есть в проекте

### Божественность

- Точки входа: `/divinity`, `/divinity/manual`.
- Назначение: расчёт прокачки по диапазону уровней, ручной прогресс, автозаполнение, учёт собственных сундуков и самоцветов.
- Тип: пользовательский калькулятор.
- Spec: [divinity-screen-spec.md](divinity-screen-spec.md).

### Билды героев

- Точки входа: `/heroes`, `/heroes/[heroId]`.
- Назначение: фильтруемый каталог опубликованных билдов и просмотр вкладок билда, экипировки, пробуждения оружия, скиллов и дерева божественности.
- Данные: один ограниченный `/bootstrap` подтверждает backend и совместимость атомарного manifest; каталог и detail читают только один полный опубликованный resource, который проходит общий ограниченный runtime-парсер и выбирается в порядке `remote → last-known-good → bundled snapshot`. LKG определяется сканированием ограниченного набора полностью проверенных immutable-поколений с commit-marker по стабильному server order, а pointer остаётся восстанавливаемой подсказкой; фоновое сохранение не задерживает уже проверенный remote.
- Загрузка: каталог и билд не показывают bundled данные до завершения выбора remote/fallback; bootstrap и full hero-build resource ограничены `8` секундами, resource deadline отменяет streaming fetch, а фоновые повторы сохраняют уже видимый контент. Основное содержимое первого принятого каталога и нового выбранного героя появляется после ограниченной попытки preload критических иконок; занятый реестр ставит новый критический URL в дедуплицированное ожидание свободного слота, а общий фиксированный placeholder исключает скачок размеров при последующей загрузке или ошибке.
- Доступ: fresh Supabase migrations явно дают `anon, authenticated` право чтения `hero_build_sets`; published-only RLS скрывает черновики, а прямые записи остаются отозваны.
- Тип: пользовательская функция с действием редактирования только для подтверждённого администратора; опубликованные билды не удаляются.
- Spec: [hero-builds-spec.md](hero-builds-spec.md).

### Билдер билдов

- Точка входа: `/admin/branch-builder`.
- Назначение: создание, сохранение черновиков, проверка, атомарная публикация, защищённое от случайного ухода обновление опубликованного комплекта единым dirty-only действием, загрузка и JSON-экспорт билдов героя.
- Данные: загружаемые draft/published payload проверяются по тому же доменному контракту, что и пользовательские билды; server-сохранения защищены revision-конфликтами и оставляют immutable историю опубликованных снимков; неуспешный переход или выход сохраняет принятую форму и revision, а новая admin-сессия заново загружает опубликованный baseline и revision.
- Загрузка: восстановление admin-сессии и первоначального edit-билда блокирует редактор общим loader до принятого результата или контролируемой ошибки.
- Тип: административная функция, защищённая проверкой Supabase admin claim при входе и восстановлении сессии, а также RLS.
- Spec: [divinity-branch-builder-spec.md](divinity-branch-builder-spec.md).

### Антиквариат

- Точка входа: `/antiques`.
- Назначение: каскадный расчёт события по монетам и картам с прогрессом наград, возвратом ресурсов и сундуками соперничества.
- Тип: пользовательский калькулятор.
- Spec: [antique-rivalry-spec.md](antique-rivalry-spec.md).

Главный экран `/` является навигацией к этим функциям и не получает отдельный capability spec. Он также показывает текущую версию и ссылку на последний GitHub Release.

## Изменения и правила

- [CHANGELOG.md](CHANGELOG.md) — что добавлено и исправлено по версиям.
- [BACKLOG.md](BACKLOG.md) — согласованные, но ещё не реализованные задачи; backlog не описывает выпущенное поведение.
- [guidelines/README.md](guidelines/README.md) — обязательные правила проекта.
- [guidelines/documentation-and-releases.md](guidelines/documentation-and-releases.md) — как обновлять specs, выпускать теги и публиковать GitHub Releases.

## Карта миграции старых материалов

Эта таблица фиксирует, куда перенесены продуктовые контракты из бывшего `docs/superpowers`. Планы не копируются дословно: учитывается только подтверждённое текущим кодом поведение.

| Старые материалы | Постоянное место |
| --- | --- |
| `divinity-owned-resources`, `divinity-resource-count-input`, `divinity-apk-data-assets` | [divinity-screen-spec.md](divinity-screen-spec.md) |
| `hero-builder-validation-and-hero-select`, builder-части `equipment-variants`, `iconic-weapon-node-bonuses`, `hero-build-tabs`, `multi-build-export`, `admin-hero-guide-selector`, `server-tab-drafts` | [divinity-branch-builder-spec.md](divinity-branch-builder-spec.md) |
| `hero-catalog`, viewer-части `equipment-variants`, `iconic-weapon-node-bonuses`, `hero-build-tabs`, `hero-localization-id-migration` | [hero-builds-spec.md](hero-builds-spec.md) |
| `antique-rivalry-calculator` | [antique-rivalry-spec.md](antique-rivalry-spec.md) |
| `project-guidelines-handbook`, `architecture-quality-followups` | [guidelines](guidelines/README.md) |

`server-tab-drafts` относится к текущему поведению: серверные черновики реализованы в `main` и входят в spec билдера.
