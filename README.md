# MH Calculator

Калькуляторы ресурсов и каталог билдов для Mythic Heroes.

## Возможности

- [Божественность](docs/divinity-screen-spec.md) — расчёт прокачки и остатка ресурсов.
- [Билды героев](docs/hero-builds-spec.md) — каталог и просмотр вариантов билдов.
- [Билдер билдов](docs/divinity-branch-builder-spec.md) — административное создание, черновики и публикация.
- [Антиквариат](docs/antique-rivalry-spec.md) — каскадный расчёт события и наград.

Полный каталог: [docs/README.md](docs/README.md).

## Версии и изменения

- [Последний GitHub Release](https://github.com/Dmitbd/mh-calculator/releases/latest)
- [История изменений](docs/CHANGELOG.md)
- [Правила выпуска версий](docs/guidelines/documentation-and-releases.md)

На GitHub опубликованный Release показывается в секции **Releases** на главной странице репозитория. Один тег без GitHub Release не показывает полноценные patch notes.

## Setup

1. Установить зависимости: `npm install`.
2. Запустить Expo dev server: `npm start`.
3. Выполнить тесты: `npm test`.
4. Собрать web-экспорт: `npm run export:web`.

## Scripts

- `npm start` — Expo dev server;
- `npm run android` — Android target;
- `npm run ios` — iOS target;
- `npm run export:web` — статический web build в `dist/`;
- `npm test` — Jest suite.

## GitHub Pages

Проект настроен на статический Expo export с base path `/mh-calculator`.

1. Отправить изменения в `main`.
2. В GitHub открыть `Settings → Pages`.
3. Выбрать `Source: GitHub Actions`.
4. Дождаться workflow `Deploy GitHub Pages`.

Сайт публикуется по адресу [dmitbd.github.io/mh-calculator](https://dmitbd.github.io/mh-calculator/). Если имя репозитория изменится, нужно синхронно обновить `expo.experiments.baseUrl` и `expo.extra.assetOrigin` в [app.json](app.json).

## Data

Данные прогресса божественности находятся в [divinity-levels.json](src/features/divinity/data/divinity-levels.json). Пользовательский прогресс и ввод калькуляторов сохраняются локально через AsyncStorage. Остальные источники данных и их integrity-правила перечислены в соответствующих capability specs.
