# План MVP: Divinity Branch Builder

**Цель:** сделать один локальный экран `/admin/branch-builder`, где пользователь указывает имя героя, собирает 3 Divinity-ветки Mythic Heroes и скачивает результат как JSON-файл на устройство.

**Что делает MVP:** пользователь вводит имя героя, выбирает тип каждой из 3 игровых веток, заполняет большие skill-ноды, проходит валидацию и нажимает `Скачать JSON`.

**Что MVP не делает:** нет выбора героя из справочника, импорта JSON, загрузки файлов в систему, автосохранения, localStorage, редактора справочников, backend, auth, Supabase, drag-and-drop и публикации данных в репозиторий.

---

## Уточнённый Scope

Оставляем только это:

- экран `/admin/branch-builder` с builder'ом Divinity-веток;
- поле `Имя героя`;
- 3 игровые колонки веток: левая, центральная основная, правая;
- в каждой колонке пользователь выбирает тип ветки из:
  - `Asterial Skills`;
  - `Psyche Skills`;
  - `Immortality Skills`;
  - `Devoid Skills`;
  - `Primeval Skills`;
- каждая выбранная ветка собирается сверху вниз;
- малые ноды статичны и берутся из общего шаблона дерева;
- большие ноды пользователь выбирает из справочника навыков выбранной ветки;
- у каждой ветки есть картинка в шапке;
- у каждой ноды есть картинка;
- после заполнения имени героя, типов всех 3 веток и всех больших нод форма валидна;
- кнопка `Скачать JSON` скачивает файл на устройство.

## Источники Данных

Используем как справочные источники:

- [Fandom Divinity](https://mythic-heroes.fandom.com/wiki/Divinity) - общий шаблон дерева 1-30 и статичные малые ноды.
- [MythicHeroes.info Divinity](https://mythicheroes.info/wiki/divinity) - структура и описания больших skills по веткам.

Важно: данные из внешних источников нужно перенести в локальные JSON-справочники руками. Приложение не должно парсить эти сайты в runtime.

## Архитектурное Решение

Проект остаётся статическим Expo web-приложением.

Правильная цепочка:

```txt
локальные JSON-справочники -> builder UI -> валидный export JSON -> пользователь скачивает файл
```

Справочники нужны, но UI должен быть простым:

- ветки и их порядок берём из `divinity-branches.json`;
- большие навыки берём из `divinity-skills.json`;
- статичные малые ноды и layout уровней берём из `tree-template.json`;
- имя героя берём из текстового поля пользователя;
- экспортируем только собранные пользователем данные, без загрузки их обратно в приложение.

## Структура Данных

### Branch

```ts
type DivinityBranchId =
  | "asterial"
  | "psyche"
  | "immortality"
  | "devoid"
  | "primeval";

type DivinityBranch = {
  id: DivinityBranchId;
  title: string;
  icon: string;
  order: number;
};
```

`order` нужен, потому что порядок веток по названию в источниках может отличаться от нужного порядка отображения.

### Branch Column

В игре есть 3 вертикальные ветки, центральная является основной. Пользователь сам определяет тип каждой из 3 колонок.

```ts
type BranchColumnId = "left" | "center" | "right";

type BranchColumn = {
  id: BranchColumnId;
  label: string;
  isMain: boolean;
};
```

### Major Skill

```ts
type DivinitySkillTier = 1 | 2 | 3;

type DivinityMajorSkill = {
  id: string;
  branchId: DivinityBranchId;
  tier: DivinitySkillTier;
  name: string;
  icon: string;
  description?: string;
};
```

### Static Node Template

Малые ноды статичны. Их не нужно редактировать в UI.

```ts
type TreeTemplateNode =
  | {
      level: number;
      columnId: BranchColumnId;
      nodeType: "majorSkill";
      tier: DivinitySkillTier;
    }
  | {
      level: number;
      columnId: BranchColumnId;
      nodeType: "minorStat";
      statId: string;
      label: string;
      value: number;
      unit: "%" | "flat" | "level";
      icon: string;
    };
```

### Export JSON

Экспорт хранит выбранные ветки и выбранные большие ноды.

```ts
type DivinityBranchBuildExport = {
  schemaVersion: 1;
  heroName: string;
  columns: {
    left: DivinityBranchId;
    center: DivinityBranchId;
    right: DivinityBranchId;
  };
  majorNodes: {
    level: number;
    columnId: BranchColumnId;
    branchId: DivinityBranchId;
    skillId: string;
  }[];
  metadata: {
    createdAt: string;
    source: "manual-branch-builder";
  };
};
```

Имя файла строится из имени героя, которое пользователь указал в поле:

```txt
{hero-name}.json
```

Имя нужно slugify'ить:

```txt
Apollo -> apollo.json
Western Queen -> western-queen.json
Oda Nobunaga -> oda-nobunaga.json
```

## UI

Один экран:

```txt
/admin/branch-builder
```

Минимальная структура:

```txt
Header: Divinity Branch Builder

Hero:
[Hero name]

Branch selectors:
[Left branch] [Center main branch] [Right branch]

Builder:
Level | Left | Center Main | Right
-------------------------------
1     |             | Skill |            
2     |             | Stat  |            
3     | Skill       |       | Skill      
...
30    | Stat        | Stat  | Stat

Footer:
[Скачать JSON]
```

Поведение:

- пользователь вводит имя героя;
- пользователь выбирает 3 ветки;
- в шапке каждой колонки показывается иконка выбранной ветки;
- minor stat nodes отображаются сразу и не редактируются;
- major skill nodes кликабельны;
- при клике на major node пользователь выбирает skill из выбранной ветки;
- skill picker фильтруется по `branchId`;
- в карточке ноды показываются icon и name выбранного skill;
- если картинка не загрузилась, показывать placeholder, но не блокировать скачивание.

## Валидация

Перед скачиванием проверить:

- имя героя заполнено;
- выбраны все 3 ветки;
- все выбранные branch IDs существуют в `divinity-branches.json`;
- все major skill slots заполнены;
- каждый `skillId` существует в `divinity-skills.json`;
- каждый выбранный skill принадлежит ветке своей колонки;
- уровни и `columnId` соответствуют `tree-template.json`;
- в скачиваемом JSON нет пустых мест для обязательных данных.

Не проверяем:

- localStorage;
- импорт;
- наличие файлов иконок на диске как blocking error.

## Файлы

Создать:

- `app/admin/branch-builder.tsx`
- `src/features/admin/screens/DivinityBranchBuilderScreen.tsx`
- `src/features/admin/components/HeroNameInput.tsx`
- `src/features/admin/components/BranchSelector.tsx`
- `src/features/admin/components/BranchBuilderGrid.tsx`
- `src/features/admin/components/BranchNodeCard.tsx`
- `src/features/admin/components/MajorSkillPicker.tsx`
- `src/features/admin/components/IconPreview.tsx`
- `src/features/admin/components/DownloadJsonButton.tsx`
- `src/features/admin/hooks/useDivinityBranchBuilder.ts`
- `src/features/admin/utils/validateBranchBuild.ts`
- `src/features/admin/utils/slugifyFileName.ts`
- `src/features/admin/utils/downloadJson.ts`
- `src/features/admin/types/admin.types.ts`
- `src/features/game-data/divinity/divinity-branches.json`
- `src/features/game-data/divinity/divinity-skills.json`
- `src/features/game-data/divinity/tree-template.json`
- `public/assets/divinity/branches/.gitkeep`
- `public/assets/divinity/skills/.gitkeep`
- `public/assets/divinity/stats/.gitkeep`

Изменить:

- `app/_layout.tsx` - добавить route config для `admin/branch-builder`, если понадобится.
- `README.md` - коротко описать workflow скачивания JSON.

Не создавать:

- `heroes.json`;
- `hero-skills.json`;
- `hero-trees`;
- import utils;
- localStorage/AsyncStorage storage для админки;
- редакторы справочников.

## Шаги Реализации

### Задача 1: Добавить справочники Divinity

- [x] Создать `src/features/game-data/divinity/divinity-branches.json`.
- [x] Добавить 5 веток: `asterial`, `psyche`, `immortality`, `devoid`, `primeval`.
- [x] У каждой ветки указать `title`, `icon`, `order`.
- [x] Создать `src/features/game-data/divinity/divinity-skills.json`.
- [x] Перенести структуру, названия, описания и иконки больших skills по веткам из справочного источника.
- [x] Создать `src/features/game-data/divinity/tree-template.json`.
- [x] Перенести шаблон уровней 1-30 и статичные minor stats из Fandom Divinity.
- [x] Скачать иконки 5 веток и 45 больших skills из MythicHeroes.info в `public/assets/divinity`.

Проверка:

```bash
npx tsc --noEmit
```

### Задача 2: Добавить типы и валидацию

- [x] Создать `src/features/admin/types/admin.types.ts`.
- [x] Описать типы branch, skill, template node, export JSON.
- [x] Описать `BranchColumnId` как `left | center | right`.
- [x] Описать связь `columnId -> selected DivinityBranchId`.
- [x] Создать `src/features/admin/utils/validateBranchBuild.ts`.
- [x] Создать `src/features/admin/utils/slugifyFileName.ts`.
- [x] Написать тесты на имя файла из имени героя.
- [x] Написать тесты на валидную форму.
- [x] Написать тесты на пустое имя героя.
- [x] Написать тесты на незаполненные major nodes.
- [x] Написать тесты на skill из неправильной ветки.

Проверка:

```bash
npm test -- src/features/admin/__tests__/validateBranchBuild.test.ts --runInBand
```

### Задача 3: Добавить builder state

- [x] Создать `src/features/admin/hooks/useDivinityBranchBuilder.ts`.
- [x] Хранить введённое имя героя.
- [x] Хранить выбранные 3 ветки.
- [x] Хранить выбранные major skills по ключу `columnId + level`.
- [x] Minor nodes не хранить в state, они приходят из template.
- [x] Подготовить функцию сборки export JSON.

Проверка:

```bash
npm test -- src/features/admin/__tests__ --runInBand
```

### Задача 4: Собрать UI builder'а

- [x] Создать экран `DivinityBranchBuilderScreen`.
- [x] Добавить поле имени героя.
- [x] Создать 3 селектора веток.
- [x] Создать grid уровней 1-30.
- [x] Отображать minor stat nodes как readonly.
- [x] Отображать major skill nodes как editable.
- [x] Фильтровать skill picker по ветке колонки.
- [x] Показывать иконки веток и нод через `IconPreview`.
- [x] Показывать validation errors рядом с кнопкой скачивания.

Проверка:

```bash
npm test -- src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx --runInBand
```

### Задача 5: Добавить скачивание JSON

- [ ] Создать `downloadJson.ts`.
- [ ] Создать `DownloadJsonButton.tsx`.
- [ ] При клике собрать export JSON.
- [ ] Запустить validation.
- [ ] Если есть errors, показать список и не скачивать.
- [ ] Если errors нет, скачать `{slugified-hero-name}.json`.

Проверка вручную:

```bash
npm start
```

Открыть `/admin/branch-builder`, ввести имя героя, выбрать 3 ветки, заполнить все большие ноды и скачать JSON.

### Задача 6: Финальная проверка

```bash
npm test -- --runInBand
npx tsc --noEmit
npm run export:web
```

Ожидаемо:

- тесты проходят;
- TypeScript без ошибок;
- static web export собирается;
- `/admin/branch-builder` доступен в web build;
- скачанный JSON содержит имя героя, выбранные ветки, major nodes и metadata.

## Критерии Приёмки

- На `/admin/branch-builder` открывается builder Divinity-веток.
- Есть поле имени героя.
- Нет выбора героя из справочника.
- Нет импорта файлов.
- Нет сохранения данных в систему.
- Пользователь выбирает тип каждой из 3 веток.
- Ветки доступны только из списка `Asterial`, `Psyche`, `Immortality`, `Devoid`, `Primeval`.
- Малые ноды отображаются статично.
- Большие ноды заполняются пользователем.
- Форма валидна только когда заполнены имя героя, все 3 ветки и все большие ноды.
- Кнопка `Скачать JSON` скачивает файл на устройство.
- Имя файла строится из имени героя, например `western-queen.json`.
- JSON не содержит лишних данных и не дублирует весь UI state.
