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
- Тип: пользовательская функция с действием редактирования только для подтверждённого администратора; опубликованные билды не удаляются.
- Spec: [hero-builds-spec.md](hero-builds-spec.md).

### Билдер билдов

- Точка входа: `/admin/branch-builder`.
- Назначение: создание, сохранение черновиков, проверка, атомарная публикация, загрузка и JSON-экспорт комплектов билдов героя.
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
