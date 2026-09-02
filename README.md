# MH Calculator

Калькуляторы ресурсов и событий, каталог билдов героев и инструменты для Mythic Heroes.

**[Открыть MH Calculator](https://dmitbd.github.io/mh-calculator/)**

## Возможности

### Калькуляторы

- [Божественность](docs/divinity-screen-spec.md) — расчёт прокачки по диапазону уровней с учётом собственных ресурсов.
- [Ветки героев](docs/divinity-talent-calculator-spec.md) — пункт главной открывает калькулятор `Таланты божественности` с выбором путей в трёх ветках и точным общим расходом очков веры, Унаследованной божественности и Резонансных камней божественности.
- [Антиквариат](docs/antique-rivalry-spec.md) — каскадный расчёт очков, наград и возврата ресурсов.
- [Призыв](docs/summon-rivalry-spec.md) — расчёт соперничества за призыв с покупками за алмазы, наградами и кешбэком.
- [Еженедельное соперничество](docs/weekly-rivalry-spec.md) — отдельные калькуляторы для «Вавилонской башни», «Карты зодиака» и «Звериных эхо».

### Билды

- [Билды героев](docs/hero-builds-spec.md) — фильтруемый каталог опубликованных билдов с экипировкой, пробуждением оружия, скиллами и игровым видом дерева божественности.
- [Билдер билдов](docs/divinity-branch-builder-spec.md) — административное создание, сохранение черновиков, публикация и обновление билдов с тем же круглым цветным деревом.

Полное описание выпущенных функций и их точек входа находится в [каталоге документации](docs/README.md).

## Версии и изменения

- [Последний GitHub Release](https://github.com/Dmitbd/mh-calculator/releases/latest)
- [История изменений](docs/CHANGELOG.md)
- [Бэклог проекта](docs/BACKLOG.md)
- [Правила документации и выпуска версий](docs/guidelines/documentation-and-releases.md)

На GitHub опубликованный Release показывается в секции **Releases** на главной странице репозитория. Один тег без GitHub Release не содержит полноценные release notes.

## Локальный запуск

Требуются Node.js `24.19.0` и npm `11.17.0`.

```bash
npm ci
npm start
```

Expo dev server предложит доступные web, Android и iOS targets.

## Проверки

```bash
npm run verify
```

Основная проверка запускает Expo compatibility check, Jest, TypeScript, чистый статический web export и проверку размера bundle. Production-browser сценарии запускаются отдельно:

```bash
npm run e2e
```

Дополнительные команды:

- `npm run android` — открыть Android target;
- `npm run ios` — открыть iOS target;
- `npm run export:web` — создать статический web build в `dist/`;
- `npm test` — запустить Jest suite.

## Публикация

Приложение развёрнуто на GitHub Pages: **[dmitbd.github.io/mh-calculator](https://dmitbd.github.io/mh-calculator/)**.

Push в `main` запускает workflow `Deploy GitHub Pages`: он проверяет проект, собирает статический Expo export с base path `/mh-calculator` и публикует artifact. Если имя репозитория изменится, нужно синхронно обновить `expo.experiments.baseUrl` и `expo.extra.assetOrigin` в [app.json](app.json).

## Данные

Данные прогресса божественности находятся в [divinity-levels.json](src/features/divinity/data/divinity-levels.json). Пользовательский прогресс и ввод калькуляторов сохраняются локально через AsyncStorage. Каталоги событий используют проверенные локальные snapshots, а опубликованные билды героев имеют контролируемый локальный fallback. Подробные источники данных и integrity-правила перечислены в соответствующих capability specs.
