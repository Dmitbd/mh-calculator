# Divinity Branch Builder Spec

Этот документ фиксирует текущую продуктовую и техническую логику билдера дерева веток божественности (`Divinity Branch Builder`).
Его цель:
- сохранить поведение при рефакторинге;
- не допустить лишних изменений от будущих агентов или разработчиков;
- дать опору для переноса на другой стек, включая SPA, без потери функциональности.

Билдер открывается как отдельный маршрут expo-router: `/admin/branch-builder`.

## Scope

Билдер дерева сейчас реализует:
- выбор ветки (`branch`) для каждого из трёх столбцов: `left`, `center`, `right`;
- сетку `30` уровней × `3` столбца с нодами двух типов: минорный стат и мажорный скилл;
- выбор мажорного скилла из скиллов выбранной ветки столбца;
- сброс выбранного мажорного скилла «крестиком»;
- отметку прогресса (активности) по клику на любую ноду — подсветка ноды и всех нод до неё в этом столбце;
- вертикальную линию-«ветку» по каждому столбцу и горизонтальные соединители на уровнях ветвления ствола;
- сборку и валидацию JSON-выгрузки, включая прогресс и список активных нод.

Билдер дерева НЕ реализует:
- ручной текстовый ввод значений нод;
- редактирование самой структуры дерева из UI (структура задаётся данными);
- расчёт суммарных бонусов/ресурсов по выбранным нодам;
- серверную синхронизацию или несколько профилей.

Экран `Divinity Branch Builder` дополнительно содержит соседние секции, которые НЕ входят в этот документ:
- режим игры PvP/PvE ([GameModeRadio](/Users/mymaughem/Desktop/work/mh-calculator/src/features/admin/components/GameModeRadio.tsx));
- пробуждение оружия ([WeaponAwakeningPicker](/Users/mymaughem/Desktop/work/mh-calculator/src/features/admin/components/WeaponAwakeningPicker.tsx)).

Эти секции живут в том же экране и в той же JSON-выгрузке, но описываются отдельно.

## Source Files

Логика билдера дерева распределена так:
- [app/admin/branch-builder.tsx](/Users/mymaughem/Desktop/work/mh-calculator/app/admin/branch-builder.tsx) — маршрут
- [src/features/admin/screens/DivinityBranchBuilderScreen.tsx](/Users/mymaughem/Desktop/work/mh-calculator/src/features/admin/screens/DivinityBranchBuilderScreen.tsx) — экран, сборка секций
- [src/features/admin/components/BranchBuilderGrid.tsx](/Users/mymaughem/Desktop/work/mh-calculator/src/features/admin/components/BranchBuilderGrid.tsx) — сетка, заголовки-селекторы веток, линии дерева
- [src/features/admin/components/BranchNodeCard.tsx](/Users/mymaughem/Desktop/work/mh-calculator/src/features/admin/components/BranchNodeCard.tsx) — `MinorStatCard` и `MajorNodeCard`
- [src/features/admin/components/MajorSkillPicker.tsx](/Users/mymaughem/Desktop/work/mh-calculator/src/features/admin/components/MajorSkillPicker.tsx) — список выбора скилла
- [src/features/admin/components/IconPreview.tsx](/Users/mymaughem/Desktop/work/mh-calculator/src/features/admin/components/IconPreview.tsx) — иконка или пунктирный плейсхолдер
- [src/features/admin/hooks/useDivinityBranchBuilder.ts](/Users/mymaughem/Desktop/work/mh-calculator/src/features/admin/hooks/useDivinityBranchBuilder.ts) — состояние и экспорт
- [src/features/admin/utils/validateBranchBuild.ts](/Users/mymaughem/Desktop/work/mh-calculator/src/features/admin/utils/validateBranchBuild.ts) — валидация
- [src/features/admin/types/admin.types.ts](/Users/mymaughem/Desktop/work/mh-calculator/src/features/admin/types/admin.types.ts) — типы
- [src/features/game-data/divinity/tree-template.json](/Users/mymaughem/Desktop/work/mh-calculator/src/features/game-data/divinity/tree-template.json) — структура дерева
- [src/features/game-data/divinity/divinity-branches.json](/Users/mymaughem/Desktop/work/mh-calculator/src/features/game-data/divinity/divinity-branches.json) — ветки
- [src/features/game-data/divinity/divinity-skills.json](/Users/mymaughem/Desktop/work/mh-calculator/src/features/game-data/divinity/divinity-skills.json) — мажорные скиллы

`BranchSelector.tsx` существует в коде как legacy-компонент и сейчас НЕ подключён: заголовки-селекторы веток реализованы прямо в `BranchBuilderGrid`.

## Data Model

### Branch (ветка)

```ts
type DivinityBranch = {
  id: "asterial" | "psyche" | "immortality" | "devoid" | "primeval";
  title: string;
  icon: string;
  order: number;
};
```

Смысл:
- `id` — стабильный идентификатор ветки;
- `title` — подпись;
- `icon` — путь к иконке в `public` (например `/img/branches/asterial.png`);
- `order` — порядок сортировки в выпадающем списке.

### Column (столбец)

```ts
type BranchColumnId = "left" | "center" | "right";

type BranchColumn = {
  id: BranchColumnId;
  label: string;
  isMain: boolean;
};
```

Текущий набор столбцов:
- `left` — `Left branch`, `isMain: false`;
- `center` — `Center main branch`, `isMain: true` (ствол);
- `right` — `Right branch`, `isMain: false`.

### Tree node (нода дерева)

Дерево задаётся плоским списком нод (`tree-template.json`). Каждая нода — это пара `level` + `columnId` и один из двух типов:

```ts
type TreeTemplateMinorStatNode = {
  level: number;          // уровень 1..30
  columnId: BranchColumnId;
  nodeType: "minorStat";
  statId: string;         // уникальный id ноды-стата
  label: string;          // название стата
  value: number;          // числовое значение бонуса
  unit: "%" | "flat" | "level";
  icon: string;           // путь к иконке или "" (пусто — без иконки)
};

type TreeTemplateMajorSkillNode = {
  level: number;
  columnId: BranchColumnId;
  nodeType: "majorSkill";
  tier: 1 | 2 | 3;        // tier нужен валидатору для распознавания слота; в UI не показывается
};
```

Важно:
- ячейка без ноды в `tree-template.json` отсутствует и рисуется как пустое место (без рамки);
- `icon: ""` означает «иконки нет» → у стата иконка не отображается;
- сейчас иконки заданы только нодам `Divinity skill level` и `Enhance limit`;
- `tier` у мажорной ноды хранится в данных, но в интерфейсе слово «tier» НЕ показывается.

Мажорные ноды (всего `9`, по `3` на столбец):
- `center`: уровни `1`, `7`, `13`;
- `left`: уровни `3`, `10`, `15`;
- `right`: уровни `3`, `10`, `15`.

### Major skill (мажорный скилл)

```ts
type DivinityMajorSkill = {
  id: string;
  branchId: DivinityBranchId; // к какой ветке относится скилл
  tier?: 1 | 2 | 3;
  name: string;
  icon: string;
  description?: string;       // в карточке дерева НЕ отображается
};
```

### Progress (прогресс / активные ноды)

```ts
// Уровень прогресса по каждому столбцу: до какой ноды включительно открыто
type BranchProgressLevels = Partial<Record<BranchColumnId, number>>;

// Активная (открытая) нода — для сохранения в JSON
type ActiveBranchNode = {
  columnId: BranchColumnId;
  level: number;
};
```

Смысл:
- `progressLevels[columnId]` — максимальный активный уровень в столбце; нода активна, если её `level <= progressLevels[columnId]`;
- `activeNodes` — производный полный список открытых нод, считается из `progressLevels`.

## Branch Selection

В шапке сетки на каждый столбец есть селектор ветки:
- web — нативный `<details>/<summary>` с шевроном `▾`; пустое состояние — пунктирная рамка и текст-подсказка; при открытии шеврон поворачивается, рамка подсвечивается;
- остальные платформы — кнопка-дропдаун (`Pressable` + выпадающий список).

Правила:
- список доступных мажорных скиллов столбца фильтруется по выбранной ветке (`skill.branchId === selectedBranch`);
- пока ветка столбца не выбрана, список выбора скилла показывает `Select branch first`;
- выбор ветки не сбрасывает уже выбранные мажорные скиллы автоматически (валидатор отдельно проверит соответствие).

## Node Cards

### Минорный стат (`MinorStatCard`)

- только для чтения по содержимому, но кликабелен для прогресса;
- карточка уже мажорной (`width: 78%`) и центрирована в своей ячейке;
- содержимое вертикально и по центру: иконка (если есть) → название → значение в формате `+N%` (для `%`) или `+N` (для `flat`/`level`);
- клик по карточке переключает прогресс столбца до этой ноды.

### Мажорная нода (`MajorNodeCard`)

- содержимое вертикально и по центру: иконка (или пунктирный круг-плейсхолдер) → имя скилла или `Select skill`;
- описание скилла и слово «tier» НЕ отображаются;
- клик открывает `MajorSkillPicker`;
- если скилл выбран — в правом верхнем углу кнопка `×` для сброса.

### IconPreview

- если `source` задан — рисует изображение;
- если иконки нет — пустой круг с пунктирной обводкой (без буквы).

## Major Skill Logic

Выбор мажорного скилла:
1. клик по мажорной ноде открывает список скиллов её ветки;
2. выбор скилла:
   - сохраняет скилл для слота `columnId:level`;
   - устанавливает прогресс столбца до уровня этой ноды (`setColumnProgress`);
   - закрывает список.
3. сброс скилла `×`:
   - очищает скилл слота;
   - откатывает прогресс столбца на ноду ниже этого уровня (`rollbackColumnProgress`).

Ключ слота — строка `"${columnId}:${level}"`.

## Progress Logic

Прогресс хранится по столбцам отдельно (`progressLevels`).

Клик по любой ноде (`toggleColumnProgress`):
- если кликнут не верхний уровень — прогресс столбца становится равен уровню кликнутой ноды (активны все ноды столбца до неё включительно);
- если повторно кликнута текущая верхняя активная нода — прогресс откатывается на предыдущую ноду столбца (или снимается полностью, если ниже нод нет).

Активность ноды определяется как `progress !== undefined && level <= progress`.

Подсветка активного состояния:
- активная нода — золотая рамка `#f0c36a` + свечение (`boxShadow`);
- активная линия-ветка — золотая с тем же свечением.

## Tree Lines

Линии дерева рисуются за карточками (карточки лежат поверх, `zIndex` контента выше линий).

### Вертикальная линия (`ветка`)

- проходит по центру столбца строго от первой до последней ноды столбца;
- до первой и после последней ноды линии нет;
- у первой ноды начинается от её центра (вниз), у последней — заканчивается на её центре;
- видна в промежутках между карточками, образуя непрерывную линию.

### Горизонтальные соединители

- рисуются только на уровнях ветвления ствола — там, где у основной (`isMain`) колонки стоит мажорная нода;
- для текущих данных это уровни `7` и `13`;
- соединяют центральную ноду с боковыми нодами того же уровня;
- идут из центра карточки (за ней) к соседям, поэтому корректно стыкуются и с узкими readonly-карточками.

### Отступы сетки

- по X между колонками: `COLUMN_GAP = 16`;
- по Y между уровнями: `ROW_GAP = 24`.

## JSON Export

`buildExport` (в `useDivinityBranchBuilder`) формирует выгрузку и возвращает `null`, если сборка неполная:
- выбраны не все три ветки, ИЛИ
- заполнены не все мажорные слоты (`majorNodes.length !== число majorSkill-нод`), ИЛИ
- выбраны не все слоты пробуждения оружия.

Форма выгрузки (поля, относящиеся к дереву, выделены):

```ts
type DivinityBranchBuildExport = {
  schemaVersion: 1;
  gameMode: "pvp" | "pve";          // соседняя секция
  heroName: string;
  columns: Record<BranchColumnId, DivinityBranchId>;        // дерево: выбранные ветки
  majorNodes: {                                             // дерево: выбранные мажорные ноды
    level: number;
    columnId: BranchColumnId;
    branchId: DivinityBranchId;
    skillId: string;
  }[];
  weaponAwakening: { slot: number; colorId: string }[];     // соседняя секция
  progress: BranchProgressLevels;                           // дерево: прогресс по столбцам
  activeNodes: { columnId: BranchColumnId; level: number }[]; // дерево: все активные ноды
  metadata: { createdAt: string; source: "manual-branch-builder" };
};
```

Важно:
- `progress` и `activeNodes` сохраняются в JSON, но НЕ участвуют в валидации;
- `activeNodes` — производное от `progress` (все ноды столбца с `level <= progress`).

## Validation

`validateBranchBuild` собирает список ошибок. Коды, относящиеся к дереву:
- `column.branchRequired` — для столбца не выбрана ветка;
- `column.branchUnknown` — выбрана несуществующая ветка;
- `majorNode.required` — мажорный слот не заполнен;
- `majorNode.slotUnknown` — выбран скилл для несуществующего слота;
- `majorNode.branchMismatch` — ветка ноды не совпадает с веткой столбца;
- `majorNode.skillUnknown` — выбран несуществующий скилл;
- `majorNode.skillBranchMismatch` — скилл не принадлежит ветке столбца.

Прочие коды (`gameMode.invalid`, `heroName.required`, `weaponAwakening.*`) относятся к соседним секциям/общим полям.

Кнопка `Проверить JSON` ([DownloadJsonButton](/Users/mymaughem/Desktop/work/mh-calculator/src/features/admin/components/DownloadJsonButton.tsx)) запускает валидацию и показывает список ошибок.

## UI Contract

В билдере дерева должны оставаться:
- заголовки-селекторы веток по столбцам;
- сетка `30 × 3` с нодами;
- вертикальные линии-ветки и горизонтальные соединители на уровнях ветвления;
- подсветка активных нод и линий;
- выбор мажорного скилла и его сброс `×`.

Намеренно убрано и не должно самовольно возвращаться:
- слово «tier» в карточке мажорной ноды;
- описание скилла в карточке мажорной ноды;
- иконки у обычных статов (кроме `Divinity skill level` и `Enhance limit`);
- буква-плейсхолдер вместо пунктирного круга при отсутствии иконки.

## Porting Rules

При переносе на другой стек нельзя терять инварианты:

1. Структура дерева задаётся данными (`tree-template.json`), а не кодом UI.
2. Три столбца `left/center/right`; `center` — основной ствол (`isMain`).
3. Мажорный слот выбирает скилл только из выбранной ветки своего столбца.
4. Клик по любой ноде задаёт прогресс столбца до неё; повторный клик по верхней — откат на ноду ниже.
5. Выбор мажорного скилла ставит прогресс до его ноды; сброс — откатывает.
6. `progress` хранится по столбцам отдельно; `activeNodes` производно от `progress`.
7. Вертикальная линия идёт только от первой до последней ноды столбца.
8. Горизонтальные соединители только на уровнях, где у `isMain`-колонки стоит мажорная нода.
9. JSON содержит `columns`, `majorNodes`, `progress`, `activeNodes`; экспорт неполной сборки запрещён (`null`).

## Change Guardrails

Без отдельного запроса нельзя:
- показывать слово «tier» или описание скилла в карточке мажорной ноды;
- делать линии дерева поверх карточек;
- тянуть вертикальную линию выше первой/ниже последней ноды столбца;
- рисовать горизонтальные соединители вне уровней ветвления ствола;
- делать прогресс общим (а не по столбцам) или менять смысл `progressLevels`;
- удалять `progress`/`activeNodes` из JSON;
- возвращать иконки всем статам или букву-плейсхолдер вместо пунктирного круга;
- класть ассеты в `public/assets/...` (конфликт с маршрутом `/assets` дев-сервера) — иконки лежат в `public/img/...`.

## Verification

Поведение хука и валидации частично покрыто тестами:
- [useDivinityBranchBuilder.test.ts](/Users/mymaughem/Desktop/work/mh-calculator/src/features/admin/__tests__/useDivinityBranchBuilder.test.ts) — пустой драфт и сборка JSON (включая `progress` и `activeNodes`);
- [validateBranchBuild.test.ts](/Users/mymaughem/Desktop/work/mh-calculator/src/features/admin/__tests__/validateBranchBuild.test.ts) — валидация и `slugifyFileName`;
- [DivinityBranchBuilderScreen.test.tsx](/Users/mymaughem/Desktop/work/mh-calculator/src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx) — поведение экрана.

Любая правка билдера дерева должна сохранять эти инварианты или осознанно обновлять одновременно код, этот документ и тесты.
