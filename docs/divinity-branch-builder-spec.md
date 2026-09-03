# Divinity Branch Builder Spec

Этот документ фиксирует текущую продуктовую и техническую логику билдера дерева веток божественности (`Divinity Branch Builder`).
Его цель:
- сохранить поведение при рефакторинге;
- не допустить лишних изменений от будущих агентов или разработчиков;
- дать опору для переноса на другой стек, включая SPA, без потери функциональности.

Билдер открывается как отдельный канонический маршрут expo-router: `/admin/branch-builder`. Отдельного file-based alias `/admin/branch-builder.html` в `app` нет; при статическом web-экспорте файл `admin/branch-builder.html` является физическим artifact именно канонического маршрута и не означает второй route. Системная шапка маршрута отключена; экран использует единый крупный однострочный заголовок через `ScreenHeader`, сохраняя асинхронный перехват кнопки `Назад` для dirty-формы.

## Scope

Билдер дерева сейчас реализует:
- выбор ветки (`branch`) для каждого из трёх столбцов: `left`, `center`, `right`;
- сетку `30` уровней × `3` столбца с нодами двух типов: минорный стат и мажорный скилл;
- выбор мажорного скилла из скиллов выбранной ветки столбца;
- замена выбранного мажорного скилла повторным нажатием по ноде;
- отметку прогресса по клику на доступную ноду после выбора всех предыдущих мажорных навыков — подсветка ноды и всех нод до неё в этом столбце;
- вертикальную линию-«ветку» по каждому столбцу и горизонтальные соединители на уровнях ветвления ствола;
- сборку и валидацию полного server payload, включая прогресс и список активных нод.

Билдер НЕ реализует:
- ручной текстовый ввод значений нод;
- редактирование самой структуры дерева из UI (структура задаётся данными);
- расчёт суммарных бонусов/ресурсов по выбранным нодам;
- offline-only сохранение без Supabase или несколько пользовательских профилей одного героя.

Экран `Divinity Branch Builder` также содержит соседние секции:
- выбор целевой PvP/PvE-вкладки ([BuildTargetSection](../src/features/admin/components/branch-builder/BuildTargetSection.tsx));
- пробуждение оружия ([WeaponAwakeningPicker](../src/features/builds/components/WeaponAwakeningPicker.tsx)).

Эти секции живут в том же экране и в том же серверном JSON payload. Данный файл является постоянным spec всего билдера, поэтому их общий контракт, серверные черновики, оборудование и публикация зафиксированы ниже.

## Source Files

Логика билдера дерева распределена так:
- [app/admin/branch-builder.tsx](../app/admin/branch-builder.tsx) — маршрут
- [src/features/admin/screens/DivinityBranchBuilderScreen.tsx](../src/features/admin/screens/DivinityBranchBuilderScreen.tsx) — экран, сборка секций
- [src/features/admin/hooks/useDivinityBranchBuilderController.ts](../src/features/admin/hooks/useDivinityBranchBuilderController.ts) — application-controller auth, entity loads, validation, revisions, server commands и stale-response lifecycle
- [src/features/admin/components/BuilderActions.tsx](../src/features/admin/components/BuilderActions.tsx) — доступные действия server draft/publication lifecycle
- [src/shared/ui/ScreenHeader.tsx](../src/shared/ui/ScreenHeader.tsx) — единая шапка и защищённая навигация назад
- [src/features/builds/components/BranchBuilderGrid.tsx](../src/features/builds/components/BranchBuilderGrid.tsx) — сетка, заголовки-селекторы веток, линии дерева
- [src/features/builds/model/branchTreeRules.ts](../src/features/builds/model/branchTreeRules.ts) — единые чистые правила последовательного доступа и уникальности веток для build UI и admin editor
- [src/features/builds/components/BranchNodeCard.tsx](../src/features/builds/components/BranchNodeCard.tsx) — `MinorStatCard` и `MajorNodeCard`
- [src/features/builds/components/MajorSkillPicker.tsx](../src/features/builds/components/MajorSkillPicker.tsx) — список выбора скилла
- [src/shared/ui/IconPreview.tsx](../src/shared/ui/IconPreview.tsx) — иконка или пунктирный плейсхолдер
- [src/shared/ui/AppImage.tsx](../src/shared/ui/AppImage.tsx) — общий фиксированный loading/error-контейнер URL-изображения
- [src/shared/ui/PixelIconLoader.tsx](../src/shared/ui/PixelIconLoader.tsx) — локальная пиксельная анимация «Тетрис-ряд» для иконок
- [src/shared/ui/useImageLoadingTransition.ts](../src/shared/ui/useImageLoadingTransition.ts) — anti-flicker, завершение движения, error и reduced-motion состояния
- [src/shared/ui/ScreenLoader.tsx](../src/shared/ui/ScreenLoader.tsx) — общий полноэкранный и встроенный loader
- [src/features/admin/hooks/useDivinityBranchBuilder.ts](../src/features/admin/hooks/useDivinityBranchBuilder.ts) — состояние и сборка payload
- [src/features/admin/model/builderEditorReducer.ts](../src/features/admin/model/builderEditorReducer.ts) — чистые переходы редактируемого draft
- [src/features/admin/model/asyncRequestIdentity.ts](../src/features/admin/model/asyncRequestIdentity.ts) — generation identity, атомарные channel-latches и единый controller асинхронных операций screen
- [src/features/admin/model/validationNavigation.ts](../src/features/admin/model/validationNavigation.ts) — перевод ошибок в leaf/секцию, scroll target и toast
- [src/features/admin/hooks/useAdminSessionGate.ts](../src/features/admin/hooks/useAdminSessionGate.ts) — восстановление и gate административной сессии
- [src/features/auth/index.ts](../src/features/auth/index.ts) — публичный административный session/claim API для admin и viewer
- [src/features/auth/adminSessionRepository.ts](../src/features/auth/adminSessionRepository.ts) — Supabase auth boundary без зависимости от admin UI
- [src/features/auth/adminAuthDiagnostics.ts](../src/features/auth/adminAuthDiagnostics.ts) — фиксированное безопасное событие отказа non-admin
- [src/features/admin/hooks/useHeroBuildStatusQuery.ts](../src/features/admin/hooks/useHeroBuildStatusQuery.ts) — current-only запрос status-каталога
- [src/features/admin/api/builderServerCommands.ts](../src/features/admin/api/builderServerCommands.ts) — типизированные исходы server-команд и revision
- [src/features/admin/utils/validateBranchBuild.ts](../src/features/admin/utils/validateBranchBuild.ts) — валидация
- [src/features/builds/model/heroBuildSetSchema.ts](../src/features/builds/model/heroBuildSetSchema.ts) — runtime-валидация загруженных Supabase payload
- [src/features/builds/api/heroBuildSetRepository.ts](../src/features/builds/api/heroBuildSetRepository.ts) — типизированная граница чтения и lifecycle RPC
- [src/features/builds/data/dataBootstrap.ts](../src/features/builds/data/dataBootstrap.ts) — build-owned bootstrap-контракт совместимости viewer-данных
- [src/features/admin/types/admin.types.ts](../src/features/admin/types/admin.types.ts) — типы
- [src/features/admin/types/validation.types.ts](../src/features/admin/types/validation.types.ts) — полный union кодов валидации
- [src/features/game-data/builds/types.ts](../src/features/game-data/builds/types.ts) — контракты рабочего и committed payload
- [src/features/game-data/divinity/types.ts](../src/features/game-data/divinity/types.ts) — ветки, ноды, скиллы и прогресс дерева
- [src/features/game-data/divinity/tree-template.json](../src/features/game-data/divinity/tree-template.json) — структура дерева
- [src/features/game-data/divinity/divinity-branches.json](../src/features/game-data/divinity/divinity-branches.json) — ветки
- [src/features/game-data/divinity/divinity-skills.json](../src/features/game-data/divinity/divinity-skills.json) — мажорные скиллы

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
  icon: string;           // путь к оригинальной APK-иконке TalentXX
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
- каждая минорная нода содержит проверенный путь к оригинальному APK-спрайту из набора `Talent01–Talent25`;
- `tier` у мажорной ноды хранится в данных, но в интерфейсе слово «tier» НЕ показывается.

Мажорные ноды (всего `9`, по `3` на столбец):
- `center`: уровни `1`, `7`, `13`;
- `left`: уровни `3`, `10`, `15`;
- `right`: уровни `3`, `10`, `15`.

### Major skill (мажорный скилл)

```ts
type DivinityMajorSkill = {
  id: string;
  branchId: DivinityBranchId;
  tier: 1 | 2 | 3;
  nodeCost: 1 | 2 | 3;
  name: string;
  icon: string;
  levels: {
    level: 1 | 2 | 3 | 4;
    description: string;
  }[];
  source?: {
    type: string;
    url?: string;
    status?: string;
  };
};
```

`tier` распознаёт слот дерева, `nodeCost` задаёт стоимость установки в узлах божественной энергии, а `levels` хранит описания эффекта по уровням прокачки. Текст не находится внутри круга: непосредственно под нодой постоянно показано только имя, без уровня и длинного описания эффекта.

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
- одна ветка не может одновременно принадлежать нескольким колонкам: selector исключает занятые другими колонками варианты, а reducer независимо отклоняет повторный branch ID;
- смена ветки очищает выбранные мажорные скиллы и прогресс только изменённой колонки, сохраняя дерево двух остальных колонок;
- смена ветки полностью очищает base/awakened loadout секции `Навыки божественности` и признак показа awakened-ряда. Если был выбран хотя бы один skill ID, экран показывает `"Навыки божественности" были сброшены`; один только раскрытый пустой awakened-ряд не создаёт ложное уведомление.

## Circular Nodes And Details

### Минорный стат (`MinorStatCard`)

- круг диаметром `46` px с оригинальной игровой иконкой;
- компактная подпись под каждой нодой постоянно показывает название и значение `+N%` или `+N`;
- в билдере клик переключает прогресс столбца, а в read-only билде нода не является кнопкой: эффект уже виден без действия.

### Мажорная нода (`MajorNodeCard`)

- круг диаметром `64` px показывает игровую иконку выбранного скилла; пустой редактируемый слот показывает `+`;
- имя скилла постоянно показано в компактной подписи под своей нодой; уровень и длинное описание эффекта в дереве не выводятся;
- в билдере клик открывает `MajorSkillPicker` под подписью на полную ширину колонки и увеличивает высоту строки вместо наложения на следующие ноды; в read-only билде нода не является кнопкой;
- повторный клик по выбранной ноде открывает тот же список для замены; отдельной кнопки сброса нет.

### Image boundary

- `BranchNodeVisual` задаёт круглую геометрию и цвет столбца, `BranchNodeCaption` — постоянную компактную подпись, `AppImage` — стабильную загрузку изображения;
- игровые TalentXX-иконки в нодах используют статический локальный режим без лишней анимации каждого элемента;
- отсутствие выбранного большого скилла остаётся контролируемым пустым состоянием, а не broken URI.

## Major Skill Logic

Выбор мажорного скилла:
1. клик по мажорной ноде открывает список скиллов её ветки;
2. выбор скилла:
   - сохраняет скилл для слота `columnId:level`;
   - устанавливает прогресс столбца до уровня этой ноды (`setColumnProgress`);
   - закрывает список.
3. повторный клик по ноде открывает список заново, а новый выбор атомарно заменяет прежний скилл;
4. смена ветки в шапке очищает выбранные ноды и прогресс этой колонки.

Ключ слота — строка `"${columnId}:${level}"`.

## Progress Logic

Прогресс хранится по столбцам отдельно (`progressLevels`).

Клик по доступной ноде (`toggleColumnProgress`):
- нижний уровень доступен, только если выбраны все предшествующие мажорные навыки этой колонки; правило одинаково для ordinary progress node и открытия major picker;
- недоступное действие не меняет draft и показывает `Сначала выберите навык выше в этой ветке.`;
- если кликнут не верхний уровень — прогресс столбца становится равен уровню кликнутой ноды (активны все ноды столбца до неё включительно);
- если повторно кликнута текущая верхняя активная нода — прогресс откатывается на предыдущую ноду столбца (или снимается полностью, если ниже нод нет).

Активность ноды определяется как `progress !== undefined && level <= progress`.

Подсветка активного состояния:
- `left` — синяя рамка и линия, `center` — зелёная, `right` — фиолетовая;
- активные ноды и линии получают яркое свечение своего цвета, неактивные сохраняют приглушённый оттенок ветки.

## Tree Lines

Линии дерева рисуются за круглыми нодами (`zIndex` контента выше линий).

### Вертикальная линия (`ветка`)

- проходит по центру столбца строго от первой до последней ноды столбца;
- до первой и после последней ноды линии нет;
- у первой ноды начинается от её центра (вниз), у последней — заканчивается на её центре;
- видна в промежутках между карточками, образуя непрерывную линию.

### Горизонтальные соединители

- рисуются только на уровнях ветвления ствола — там, где у основной (`isMain`) колонки стоит мажорная нода;
- для текущих данных это уровни `7` и `13`;
- соединяют центральную ноду с боковыми нодами того же уровня;
- представлены одной линией уровня позади всех трёх непрозрачных круглых контейнеров, поэтому не пересекают видимые игровые иконки при любом масштабе; неактивная нода тонируется отдельным слоем поверх изображения без изменения его opacity;
- содержат оригинальный ромб `Talent12` между боковой и центральной ветками: `Узлы божественной энергии`, точный эффект из APK `Предел узлов божественной энергии +1`; видимая подпись отсутствует, полная семантика остаётся доступной screen reader;
- ромб является характеристикой соединения, а не интерактивной нодой прогресса.

Неактивная линия сохраняет единый непрозрачный тёмный цвет и слабое свечение своей ветки и остаётся заметнее неактивной ноды на любом фоне. Полностью ярким становится только соединитель между двумя активными нодами. После последней активной ноды яркий хвост заканчивается у нижней границы её подписи, а путь до следующей ноды остаётся тёмным. Над колонкой уровней один раз выводится `lv.`, строки подписаны только числами `1–30` без повторения `Lv.`.

### Отступы сетки

- по X между колонками: `COLUMN_GAP = 16`;
- по Y между уровнями: `ROW_GAP = 24`.

## Server Payload Assembly

`buildExport` (в `useDivinityBranchBuilder`) формирует типизированный payload одной рабочей вкладки и возвращает `null`, если сборка неполная:
- path вкладки не определяет режим игры, ИЛИ
- не выбран герой из мастер-каталога, ИЛИ
- нет хотя бы одного артефакта или одной руны, ИЛИ
- выбраны не все три ветки, ИЛИ
- заполнены не все мажорные слоты (`majorNodes.length !== число majorSkill-нод`), ИЛИ
- выбраны не все слоты пробуждения оружия.

Source contract разделяет рабочий payload билдера с координатой вкладки и committed leaf внутри `HeroBuildSet`:

```ts
type DivinityBranchBuildExport = {
  schemaVersion: 1;
  gameMode: "pvp" | "pve";
  heroId: string;
  heroName: string;
  columns: Record<BranchColumnId, DivinityBranchId>;
  majorNodes: {
    level: number;
    columnId: BranchColumnId;
    branchId: DivinityBranchId;
    skillId: string;
  }[];
  divinitySkills?: {
    base: string[];
    awakened?: string[];
  };
  weaponAwakening: { slot: number; colorId: string }[];
  equipment: {
    artifactIds: string[];
    runeIds: string[];
  };
  progress: BranchProgressLevels;
  activeNodes: { columnId: BranchColumnId; level: number }[];
  metadata: { createdAt: string; source: "manual-branch-builder" };
};

type HeroBuildTargetTabPath = string[];

type DivinityBranchBuilderExport = DivinityBranchBuildExport & {
  targetTabPath: HeroBuildTargetTabPath;
};
```

Важно:
- рабочий `DivinityBranchBuilderExport` содержит `targetTabPath`; после размещения в `HeroBuildSet` committed leaf хранит вложенный `DivinityBranchBuildExport` без этого поля. Название типа не означает наличие файлового export-действия;
- `progress` и `activeNodes` сохраняются в JSON и не участвуют в интерактивной проверке незавершённой формы; при чтении готового Supabase payload runtime-схема проверяет диапазоны, tree-template paths и точное соответствие производного `activeNodes` значению `progress`;
- `activeNodes` — производное от `progress` (все ноды столбца с `level <= progress`).

## Validation

`validateBranchBuild` собирает типизированный список ошибок. Полный union находится в `validation.types.ts`; spec группирует его по владельцам секций:

- герой: `hero.required`, `hero.unknown`, `hero.nameMismatch`;
- режим: `gameMode.invalid`;
- варианты экипировки: `equipment.artifactRequired`, `equipment.artifactUnknown`, `equipment.artifactDuplicate`, `equipment.runeRequired`, `equipment.runeUnknown`, `equipment.runeDuplicate`;
- навыки божественности: `divinitySkills.required`, `divinitySkills.slotLimitExceeded`, `divinitySkills.skillUnknown`, `divinitySkills.duplicate`, `divinitySkills.nodeBudgetExceeded`;
- прогресс каждой колонки: `progress.minimumLevel`; server-write требует минимум уровень `18` для `left`, `center` и `right`;
- пробуждение оружия: `weaponAwakening.slotRequired`, `weaponAwakening.colorUnknown`.

Коды дерева:

- `column.branchRequired` — для столбца не выбрана ветка;
- `column.branchUnknown` — выбрана несуществующая ветка;
- `majorNode.required` — мажорный слот не заполнен;
- `majorNode.slotUnknown` — выбран скилл для несуществующего слота;
- `majorNode.branchMismatch` — ветка ноды не совпадает с веткой столбца;
- `majorNode.skillUnknown` — выбран несуществующий скилл;
- `majorNode.skillBranchMismatch` — скилл не принадлежит ветке столбца;
- `majorNode.skillTierMismatch` — tier скилла не соответствует слоту.

Сборка полного комплекта дополнительно использует `multiBuild.missingTab` и `multiBuild.gameModeMismatch`. Пустой выбор героя даёт `hero.required`, а несовпадение имени выбранному каталожному герою — `hero.nameMismatch`.

Валидация полного payload запускается действиями `Опубликовать` и `Обновить`; `Сохранить вкладку` валидирует текущую вкладку. Ошибки показываются у полей, в общей области вкладок и в ограниченном toast.

## UI Contract

В билдере дерева должны оставаться:
- заголовки-селекторы веток по столбцам;
- сетка `30 × 3` с нодами;
- вертикальные линии-ветки и горизонтальные соединители на уровнях ветвления;
- подсветка активных нод и линий;
- выбор и замена мажорного скилла повторным нажатием по круглой ноде;
- круглые APK-иконки и постоянная компактная подпись под каждой нодой.

Подпись выбранной мажорной ноды содержит только имя навыка — без уровня и длинного описания. Варианты замены отображаются единым непрозрачным блоком с цветной рамкой ветки, располагаются в обычном потоке под подписью и не перекрывают следующие уровни. Отдельная кнопка сброса `×` отсутствует; смена ветки в шапке очищает относящиеся к ней выбранные ноды и прогресс, а также весь зависимый divinity-skill loadout с условным уведомлением.

Намеренно убрано и не должно самовольно возвращаться:
- слово «tier» внутри ноды;
- текст внутри кругов нод;
- квадратные карточки нод.

## Complete Builder Workflow

`/admin/branch-builder` — единая функция создания и сопровождения комплекта билдов героя. Помимо дерева, экран включает:

- admin-аутентификацию;
- выбор целевого героя и режима создания/редактирования;
- верхнеуровневые и вложенные папки вкладок;
- режим игры;
- варианты артефактов и рун;
- пробуждение оружия и вычисленные бонусы;
- base/awakened loadout скиллов божественности;
- локальное сохранение валидной вкладки в комплект;
- загрузку server draft или опубликованного baseline, сохранение текущей вкладки в server draft, атомарную публикацию и обновление опубликованного комплекта.

Файловый импорт/экспорт JSON не является пользовательской возможностью билдера. Кнопки `Скачать полный JSON`, `Загрузить билд` и отдельная `Сохранить черновик` удалены; JSON остаётся только форматом проверяемого server payload.

Новые секции этого экрана дописываются сюда и не получают отдельный постоянный spec.

## Authentication And Backend Boundary

Административная сессия признаётся только для Supabase-пользователя, у которого `app_metadata.role === "admin"`. Стабильный контракт сессии содержит `id`, `email` и литеральную роль `admin`. Обычная authenticated-сессия не открывает билдер и не даёт доступ к server draft/published данным. Если password login успешен, но admin claim отсутствует, клиент через публичный `signOut({ scope: "local" })` пытается удалить созданную локальную сессию и независимо от результата показывает `Недостаточно прав администратора.`; восстановленная non-admin сессия считается отсутствующей административной сессией. `auth-js` не предоставляет публичного force-clear API: при ошибке local sign-out клиент всё равно не создаёт `AdminSession`, а RLS не допускает non-admin JWT к защищённым данным.

Контракт административной сессии принадлежит нейтральной feature `auth` и доступен admin/viewer только через `@/features/auth`; он не зависит от admin UI, hero screens или игровых каталогов. Отказ non-admin дополнительно фиксируется auth-owned wrapper только bounded событием `MH_DIAGNOSTIC { area: "admin-auth", event: "access-denied" }`. Email, JWT, password, raw auth error и backend response в diagnostic не передаются.

До завершения первоначального восстановления admin-сессии экран показывает общий полноэкранный loader `Проверяем доступ` и не раскрывает форму входа или builder. Полноэкранный и встроенный loader используют одну доступную композицию: emoji-молния мягко пульсирует внутри расходящегося кольца, а две круглые искры движутся по орбите; при reduced motion композиция остаётся статичной. Если восстановленная admin-сессия открывает валидный `mode=edit&heroId=...`, loader продолжает блокировать editor и hero selector до принятия опубликованного комплекта или контролируемой ошибки; между auth и edit effects нет commit пустого редактора. `AdminAuthPanel` поддерживает вход и выход, состояния pending и видимые success/error toast. Если Supabase не настроен, серверное действие завершается контролируемым `Supabase не настроен.`, а не падением.

Supabase RLS повторяет границу чтения: `draft` доступен только JWT с `app_metadata.role = admin`, без admin claim можно читать только строки `published`. Прямые `insert/update/delete` для `anon` и `authenticated` отозваны; даже admin-клиент выполняет lifecycle-запись только через узкие `SECURITY DEFINER` RPC. Каждая RPC независимо проверяет точный `app_metadata.role === "admin"`, ожидаемое исходное состояние строки, переданную клиентом `expected_revision` и число затронутых строк. Клиентская проверка управляет UI, но не заменяет server boundary; RLS остаётся дополнительной защитой чтения.

Публичные viewer-экраны допускают чтение published resource только после совместимого `/bootstrap`. Этот gate не заменяет admin authentication/RLS и намеренно не оборачивает lifecycle-записи билдера: административные операции продолжают использовать собственную авторизованную repository-границу, revision и conflict semantics. Edge Function с публичным `SUPABASE_ANON_KEY` вызывает один `SECURITY INVOKER` SQL RPC: явный published-фильтр и RLS сохраняются, а наружу возвращается только детерминированный manifest без draft/private metadata, service-role bypass или секретов в клиенте.

Каждая server-строка имеет монотонный `revision` (существующие и впервые созданные строки начинают с `1`) и `updated_by`, равный один раз захваченному `auth.uid()`. Каждая write RPC отклоняет запрос без authenticated actor даже при наличии admin role claim. Успешное изменение увеличивает revision ровно один раз и в той же транзакции добавляет immutable history event с тем же автором, предыдущими и новыми status/payload snapshots. Создание draft передаёт `expected_revision = null` как явное ожидание отсутствующей строки; последующие сохранение, публикация и редактирование требуют загруженную текущую revision. Несовпадение revision, отсутствие строки или неверное исходное состояние возвращаются repository как `HeroBuildSetRepositoryError` с `kind: "conflict"`, отдельно от `network` и `invalid-data`.

История опубликованных snapshot доступна только администратору. Восстановление не изменяет и не удаляет старые history rows: узкая admin RPC требует одновременно `hero_id`, history ID этого же героя и ожидаемую текущую revision, после чего создаёт более новую published revision с событием `restored_published`. Чужая или несовпадающая history-запись отклоняется до изменения текущей строки.

## Hero States And Selector

Supabase возвращает ID отдельно по статусам `draft` и `published`, но на каждого героя существует не более одной server-строки. Селектор делит мастер-каталог на взаимоисключающие группы:

- `Не созданы` — нет ни draft, ни published строки;
- `Не опубликованы` — существует draft, но нет published строки;
- опубликованные герои доступны для редактирования опубликованного билда.

Опубликованный герой не должен одновременно оставаться в `Не опубликованы`. Загрузка каталога имеет request identity: поздний ответ закрытого или устаревшего запроса не обновляет экран. Во время первоначальной загрузки раскрытый селектор использует встроенный общий loader. При фоновом обновлении выбранный герой остаётся в заголовке, а каталог не подменяется неотфильтрованными данными; ошибка оставляет контролируемую повторную попытку.

## Tabs And Local Drafts

Тип и helpers комплекта рекурсивно поддерживают группы вкладок, но текущий UI билдера создаёт и показывает только корневой уровень и один уровень дочерних leaf-вкладок. Каждому leaf соответствует независимый editable draft, индексируемый полным path. Переключение вкладки не переносит значения соседнего leaf, не запускает валидацию и не теряет локальные изменения.

`Сохранить вкладку` в create/draft workflow:

1. валидирует только текущий leaf;
2. собирает partial `HeroBuildSet` с текущей вкладкой и устойчивыми `heroId`, path и build contract;
3. создаёт или обновляет строку героя в Supabase только как `status: "draft"`; существующую published-строку эта операция не понижает;
4. только после успешного server save фиксирует подготовленный snapshot в локальном собираемом комплекте и обновляет status-каталог;
5. не публикует данные: `published`-строка меняется только отдельным действием публикации.

Повторное сохранение блокируется, пока запрос текущей вкладки не завершён. Выбор другого героя синхронно инвалидирует pending tab-save и publication: поздний ответ предыдущего героя не меняет revision, status-каталог, toast или loading нового героя. Identity формы меняется только после успешного принятия загруженного билда; ошибка, отсутствие строки или недоступный Supabase оставляют прежнюю форму активной и пригодной для повторного сохранения. Устаревший ответ после смены героя/вкладки или закрытия экрана не должен применить snapshot или показать ложный success. Ошибка Supabase сохраняет текущие поля редактирования и показывает backend error, но не выдаёт вкладку за сохранённую. Optimistic conflict также не коммитит подготовленный snapshot и не сбрасывает локальные правки: экран показывает `Билд изменён в другой сессии. Ваши правки сохранены в форме; загрузите актуальную версию.`

В create/draft workflow полный server payload собирается только из сохранённых leaf-вкладок. Пустые группы и незавершённые drafts не должны маскироваться как готовый комплект. В `mode=edit` полный комплект собирается из текущего локального draft каждого leaf, включая ещё не сохранённые изменения открытой и остальных вкладок.

## Equipment And Weapon Awakening

- Артефакты и руны хранятся отдельными массивами стабильных IDs; они не образуют пары.
- Варианты принадлежат текущей вкладке, сохраняют порядок добавления и записываются в payload как `equipment.artifactIds` и `equipment.runeIds`.
- В каждом массиве нужен хотя бы один вариант; неизвестный или повторный ID блокирует сохранение server payload.
- Добавление исключает уже выбранные элементы, удаление одного варианта не меняет второй тип экипировки.
- Пробуждение оружия хранит selections по слотам; бонусы вычисляются из каталога и класса выбранного героя по порогам и правилам из [Hero Builds Spec](hero-builds-spec.md#weapon-awakening).
- Server payload содержит исходные selections, а не только отображаемый текст бонуса.

## Divinity Skill Loadout

Base и awakened slots редактируются отдельно. Awakened-набор применяется только при включённом состоянии. Дубликаты и несовместимые уровни/ветки блокируются валидацией. Скилл дерева и скилл loadout используют общие стабильные IDs каталога, но являются разными частями build contract.

## Server Drafts And Publication

Таблица `hero_build_sets` хранит для каждого `hero_id` не более одной строки со статусом `draft` или `published`.

- `Сохранить вкладку` валидирует текущую leaf-вкладку и создаёт либо обновляет server draft полного комплекта, сохраняя уже принятые leaf-вкладки.
- Выбор героя из `Не опубликованы` загружает только его draft через `fetchDraftHeroBuildSet` и восстанавливает редактируемые вкладки.
- Повторная загрузка блокируется, пока предыдущая draft-load операция не завершена.
- Устаревший ответ после выбора другого героя или закрытия селектора не должен менять текущий draft или показывать ложный успех; неуспешный выбор draft не меняет identity уже принятой формы.
- `Опубликовать` вызывает один RPC, который атомарно обновляет payload существующего draft и переводит ту же строку в status `published`.
- Если draft отсутствует, RPC завершает публикацию ошибкой и не создаёт отдельную published-строку.
- После успешной публикации status-каталог обновляется: герой удаляется из draft IDs и добавляется в published IDs.
- В `mode=edit` действия создания скрыты: нет `Сохранить вкладку`, `Опубликовать` и удаления. После семантического изменения показывается единственная кнопка `Обновить`, во время запроса — `Обновляем...`; у чистой формы action отсутствует.
- Загрузка `mode=edit` сохраняет неизменяемый опубликованный baseline и отдельный локальный editable draft для каждого leaf. Структурный `isDirty` сравнивает пользовательские поля всех leaf, сбрасывается при полном возврате значений к baseline и не реагирует на служебные timestamps. Только успешное обновление опубликованного payload принимает текущую форму как новый baseline; revision остаётся отдельным server-конкурентным контрактом.
- `Обновить` валидирует полный локальный комплект, открывает вкладку и секцию первой ошибки и не выполняет запись при ошибках. Успех принимает отправленный snapshot как новый baseline и скрывает action; конфликт или сетевой сбой сохраняет локальные правки и возможность повторить обновление. Если форма меняется во время запроса, server snapshot принимается как baseline без потери более новых правок, а action остаётся доступным.
- При несохранённых изменениях кнопка назад в шапке, выход администратора и выбор другого героя требуют подтверждения. Параллельные подтверждения выхода и выбора героя сериализуются по правилу «первое намерение побеждает»: повторное действие игнорируется до завершения текущего диалога, а после размонтирования продолжение запрещено. Ошибка перехватчика ухода закрывает переход, а не выполняет его. На web перезагрузка и закрытие вкладки защищены `beforeunload`; обработчик существует только у dirty-формы и снимается при очистке или размонтировании. Переключение вкладок одного билда остаётся свободным, не запускает валидацию и не требует подтверждения.
- Начало выхода из `mode=edit` инвалидирует identity pending load/save/update requests, но до подтверждённого server-выхода сохраняет принятую форму и её revision; поздние ответы отменённых запросов не меняют revision или baseline. При ошибке выхода dirty-форму можно немедленно обновить с той же expected revision. Только успешный выход очищает identity загруженной формы, активного героя и revision. После следующего входа опубликованная строка обязательно загружается заново и формирует чистый baseline с актуальной revision.
- Опубликованный payload обновляется только отдельной repository-операцией, которая требует исходный status `published` и не меняет его.
- Все три lifecycle-операции repository вызывают отдельные RPC: create/update draft, draft-to-published и update published. Прямой table DML недоступен `anon` и `authenticated`.
- Публичный repository API не содержит операций удаления. Database trigger запрещает удалить published-строку, вернуть её в draft или изменить её `hero_id`.
- Любой draft/published `payload` читается как недоверенный `jsonb` и проходит `heroBuildSetSchema` до восстановления редактора. Несовместимая версия, неверная hero identity, повреждённые tabs/path, неизвестные catalog IDs или несогласованные build-поля дают типизированную `HeroBuildSetRepositoryError(kind: "invalid-data")`, а не частично восстановленный draft.
- Сетевой сбой имеет `kind: "network"`, только отсутствие самой строки остаётся отдельным `null`/`no-data` исходом. Непустая строка без собственного data-property `payload` или с унаследованным/accessor `payload` считается `invalid-data`. Публичный loader может сохранить локальный fallback, но сообщает точную причину через диагностический `onFallback` outcome.
- Загруженный committed leaf обязан быть полным: все major slots и weapon slots заполнены, progress задан для трёх колонок минимум до уровня `18`, major nodes не выше progress, а `activeNodes` точно ему соответствует. Runtime parser ограничен budgets из [Hero Builds Spec](hero-builds-spec.md#backend-payload-boundary), одним рекурсивным проходом проверяет унаследованный `gameMode`, отвергает sparse/accessor arrays, accessor properties, лишние или слишком многочисленные поля, non-plain objects и неканонический UTC `createdAt`.

## Validation And Feedback

Валидация остаётся чистой и возвращает errors с путями. Экран:

- в `mode=edit` проверяет полный текущий комплект из всех локальных leaf-drafts, открывает вкладку первой ошибки и переводит её полный path в относительный field path для inline-подсказки выбранного leaf;
- группирует ошибки по секциям;
- показывает не более пяти уникальных сообщений в toast и число скрытых;
- после открытия проблемной вкладки прокручивает к точной секции первой ошибки;
- очищает относящиеся к полю ошибки после исправления;
- блокирует server save/publish/update неполного комплекта.

Backend success не должен жить дольше актуальной операции или выбранного героя. Loading, error, empty и retry состояния являются частью контракта, а не временным служебным UI.

Внутренняя ownership-граница также является правилом переноса: screen владеет только safe-area, layout/scroll и компоновкой секций; application-controller связывает auth, entity loads, validation, revisions, server commands, dirty transitions и stale-response lifecycle; editor hook хранит editor-session; чистый reducer владеет переходами draft; request identity определяет актуальность async-ответов; status query владеет каталогом server-состояний; validation navigation переводит доменные paths в выбранный leaf и секцию. Эти модули не меняют пользовательский контракт и не должны снова сливаться в route-level screen.

Reducer вычисляет следующий цвет пробуждения из draft, полученного самим state transition, поэтому несколько кликов, объединённых React в один batch, не теряются и проходят каталог последовательно. Screen не ведёт параллельные request-id/in-flight refs для initial edit, draft, entity, auth, dirty-discard, tab-save или publish: атомарный controller сериализует intent, инвалидирует устаревшие поколения и освобождает только актуальный latch.

## Porting Rules

При переносе на другой стек нельзя терять инварианты:

1. Структура дерева задаётся данными (`tree-template.json`), а не кодом UI.
2. Три столбца `left/center/right`; `center` — основной ствол (`isMain`).
3. Мажорный слот выбирает скилл только из выбранной ветки своего столбца.
4. Нода доступна только после выбора всех предыдущих мажорных навыков её колонки; клик задаёт прогресс до доступной ноды, повторный клик по верхней — откат на ноду ниже.
5. Выбор или замена мажорного скилла ставит прогресс до его ноды; смена ветки очищает ноды и прогресс изменённой колонки, весь base/awakened divinity loadout и awakened-флаг, не затрагивая дерево других колонок.
6. Одна ветка может быть выбрана только в одной колонке; запрет обеспечивают независимо UI options и reducer.
7. `progress` хранится по столбцам отдельно; `activeNodes` производно от `progress`.
8. Вертикальная линия идёт только от первой до последней ноды столбца.
9. Горизонтальные соединители только на уровнях, где у `isMain`-колонки стоит мажорная нода.
10. Цвет пути определяется колонкой: синий, зелёный, фиолетовый; минорные ноды используют оригинальные APK-иконки и постоянно показывают характеристику, а большие ноды показывают только имя выбранного навыка.
11. Server JSON содержит `columns`, `majorNodes`, `progress`, `activeNodes`; сборка неполного комплекта для server write запрещена (`null`).
12. Вкладки независимы по полному path; data contract и helpers рекурсивны, а текущий builder UI создаёт не более двух отображаемых уровней.
13. Server build — одна строка на `hero_id`; публикация атомарно переводит эту строку из draft в published.
14. Устаревшие async-ответы не меняют выбранного героя и не показывают ложный успех.
15. Admin-доступ требует `app_metadata.role === "admin"` одновременно на клиентской auth-границе и в Supabase RLS.

## Change Guardrails

Без отдельного запроса нельзя:
- показывать слово «tier» или описание внутри круга мажорной ноды;
- делать линии дерева поверх круглых нод;
- тянуть вертикальную линию выше первой/ниже последней ноды столбца;
- рисовать горизонтальные соединители вне уровней ветвления ствола;
- делать прогресс общим (а не по столбцам) или менять смысл `progressLevels`;
- разрешать использование нижней ноды до выбора всех предшествующих major skills;
- разрешать один branch ID в нескольких колонках или очищать дерево незатронутых колонок при смене ветки;
- сохранять divinity-skill loadout после смены ветки без нового продуктового решения;
- удалять `progress`/`activeNodes` из JSON;
- заменять найденные APK-иконки самодельными изображениями без отдельного согласования;
- класть ассеты в `public/assets/...` (конфликт с маршрутом `/assets` дев-сервера) — иконки лежат в `public/img/...`.
- считать сохранение одной вкладки публикацией полного комплекта;
- смешивать героев со статусами draft и published в одной группе селектора;
- создавать для одного героя отдельные draft и published строки;
- возвращать файловый импорт/экспорт или отдельное действие полного draft-save без нового продуктового решения;
- удалять или понижать до draft опубликованную строку;
- хранить computed-текст бонусов вместо selections и каталогов;
- создавать отдельные постоянные specs для вкладок, экипировки или server drafts этого билдера.

## Verification

Поведение хука и валидации частично покрыто тестами:
- [operational-smoke.spec.ts](../e2e/operational-smoke.spec.ts) — production-browser отказ non-admin и dirty edit confirmation;
- [useDivinityBranchBuilder.test.ts](../src/features/admin/__tests__/useDivinityBranchBuilder.test.ts) — пустой драфт и сборка server JSON (включая `progress` и `activeNodes`);
- [validateBranchBuild.test.ts](../src/features/admin/__tests__/validateBranchBuild.test.ts) — доменная валидация вкладки;
- [BuilderActions.test.tsx](../src/features/admin/__tests__/BuilderActions.test.tsx) — доступные create/edit actions и pending-состояния;
- [branchTreeRules.test.ts](../src/features/builds/__tests__/branchTreeRules.test.ts) — последовательный доступ и единый контракт уникальности веток;
- [heroBuildSetSchema.test.ts](../src/features/builds/model/__tests__/heroBuildSetSchema.test.ts) — версия и полная runtime-целостность загруженного комплекта;
- [useDivinityBranchBuilderController.test.tsx](../src/features/admin/__tests__/useDivinityBranchBuilderController.test.tsx) — публичная grouped-граница controller, auth state и validation handoff;
- [adminSessionRepository.test.ts](../src/features/auth/__tests__/adminSessionRepository.test.ts) — общий session/claim контракт и безопасный non-admin cleanup;
- `DivinityBranchBuilderScreen.*.test.tsx` и [builderScreenFixture.tsx](../src/features/admin/testing/builderScreenFixture.tsx) — интеграционное UI-подтверждение auth/load, create/draft/publish, edit/update/conflict и navigation/validation/concurrency через один общий fixture;
- [builderEditorReducer.test.ts](../src/features/admin/__tests__/builderEditorReducer.test.ts), [asyncRequestIdentity.test.ts](../src/features/admin/__tests__/asyncRequestIdentity.test.ts), [validationNavigation.test.ts](../src/features/admin/__tests__/validationNavigation.test.ts), [useAdminSessionGate.test.ts](../src/features/admin/__tests__/useAdminSessionGate.test.ts), [useHeroBuildStatusQuery.test.ts](../src/features/admin/__tests__/useHeroBuildStatusQuery.test.ts) и [builderServerCommands.test.ts](../src/features/admin/__tests__/builderServerCommands.test.ts) — focused boundaries декомпозированного workflow;
- [heroBuildSetRepository.test.ts](../src/features/builds/api/__tests__/heroBuildSetRepository.test.ts) — draft/published запросы и явные lifecycle-операции;
- [branchBuilderTabs.test.ts](../src/features/admin/__tests__/branchBuilderTabs.test.ts) — структура вкладок и path;
- [multiBuildExport.test.ts](../src/features/admin/__tests__/multiBuildExport.test.ts) — сборка полного комплекта;
- [publishedBuilderEditModel.test.ts](../src/features/admin/__tests__/publishedBuilderEditModel.test.ts) — immutable baseline, полные локальные leaf-drafts, dirty-state и координаты первой ошибки режима редактирования;
- [publicationRules.test.ts](../src/features/admin/__tests__/publicationRules.test.ts) — обнаружение конфликта create-публикации с уже опубликованным билдом;
- [heroBuildSetsLifecycleSql.test.js](../src/features/admin/__tests__/heroBuildSetsLifecycleSql.test.js) — структура migration, server trigger и publication RPC;
- [heroBuildSetRevisionsSql.test.js](../src/features/admin/__tests__/heroBuildSetRevisionsSql.test.js) — revision/history immutability, optimistic predicates и restore RPC;
- [heroGuideSelectorModel.test.ts](../src/features/admin/__tests__/heroGuideSelectorModel.test.ts) — взаимоисключающие списки героев;
- [HeroGuideSelector.test.tsx](../src/features/admin/__tests__/HeroGuideSelector.test.tsx) — loading/error/группы селектора;
- [ScreenLoader.test.tsx](../src/shared/ui/__tests__/ScreenLoader.test.tsx) — режимы, accessibility, reduced motion и cleanup анимации;
- [AppImage.test.tsx](../src/shared/ui/__tests__/AppImage.test.tsx) и [useImageLoadingTransition.test.tsx](../src/shared/ui/__tests__/useImageLoadingTransition.test.tsx) — пиксельный loader, anti-flicker, responsive layout, завершение, ошибка и reduced motion;
- [WeaponAwakeningPicker.test.tsx](../src/features/builds/__tests__/WeaponAwakeningPicker.test.tsx) и [WeaponAwakeningBonusList.test.tsx](../src/features/builds/__tests__/WeaponAwakeningBonusList.test.tsx) — иконки цветов внутри уже доступных элементов;
- [EquipmentVariantBuilder.test.tsx](../src/features/admin/__tests__/EquipmentVariantBuilder.test.tsx) — варианты экипировки;
- [weaponAwakening.test.ts](../src/features/admin/__tests__/weaponAwakening.test.ts) — selections пробуждения;

Любая правка билдера дерева должна сохранять эти инварианты или осознанно обновлять одновременно код, этот документ и тесты.
