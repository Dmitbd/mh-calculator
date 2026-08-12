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

Билдер НЕ реализует:
- ручной текстовый ввод значений нод;
- редактирование самой структуры дерева из UI (структура задаётся данными);
- расчёт суммарных бонусов/ресурсов по выбранным нодам;
- offline-only сохранение без Supabase или несколько пользовательских профилей одного героя.

Экран `Divinity Branch Builder` также содержит соседние секции:
- режим игры PvP/PvE ([GameModeRadio](../src/features/admin/components/GameModeRadio.tsx));
- пробуждение оружия ([WeaponAwakeningPicker](../src/features/builds/components/WeaponAwakeningPicker.tsx)).

Эти секции живут в том же экране и в той же JSON-выгрузке. Данный файл является постоянным spec всего билдера, поэтому их общий контракт, серверные черновики, оборудование и публикация зафиксированы ниже.

## Source Files

Логика билдера дерева распределена так:
- [app/admin/branch-builder.tsx](../app/admin/branch-builder.tsx) — маршрут
- [src/features/admin/screens/DivinityBranchBuilderScreen.tsx](../src/features/admin/screens/DivinityBranchBuilderScreen.tsx) — экран, сборка секций
- [src/features/builds/components/BranchBuilderGrid.tsx](../src/features/builds/components/BranchBuilderGrid.tsx) — сетка, заголовки-селекторы веток, линии дерева
- [src/features/builds/components/BranchNodeCard.tsx](../src/features/builds/components/BranchNodeCard.tsx) — `MinorStatCard` и `MajorNodeCard`
- [src/features/builds/components/MajorSkillPicker.tsx](../src/features/builds/components/MajorSkillPicker.tsx) — список выбора скилла
- [src/shared/ui/IconPreview.tsx](../src/shared/ui/IconPreview.tsx) — иконка или пунктирный плейсхолдер
- [src/features/admin/hooks/useDivinityBranchBuilder.ts](../src/features/admin/hooks/useDivinityBranchBuilder.ts) — состояние и экспорт
- [src/features/admin/utils/validateBranchBuild.ts](../src/features/admin/utils/validateBranchBuild.ts) — валидация
- [src/features/builds/model/heroBuildSetSchema.ts](../src/features/builds/model/heroBuildSetSchema.ts) — runtime-валидация загруженных Supabase payload
- [src/features/builds/api/heroBuildSetRepository.ts](../src/features/builds/api/heroBuildSetRepository.ts) — типизированная граница чтения и lifecycle RPC
- [src/features/admin/types/admin.types.ts](../src/features/admin/types/admin.types.ts) — типы
- [src/features/game-data/divinity/tree-template.json](../src/features/game-data/divinity/tree-template.json) — структура дерева
- [src/features/game-data/divinity/divinity-branches.json](../src/features/game-data/divinity/divinity-branches.json) — ветки
- [src/features/game-data/divinity/divinity-skills.json](../src/features/game-data/divinity/divinity-skills.json) — мажорные скиллы

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
- path вкладки не определяет режим игры, ИЛИ
- не выбран герой из мастер-каталога, ИЛИ
- нет хотя бы одного артефакта или одной руны, ИЛИ
- выбраны не все три ветки, ИЛИ
- заполнены не все мажорные слоты (`majorNodes.length !== число majorSkill-нод`), ИЛИ
- выбраны не все слоты пробуждения оружия.

Форма выгрузки (поля, относящиеся к дереву, выделены):

```ts
type DivinityBranchBuilderExport = {
  schemaVersion: 1;
  gameMode: "pvp" | "pve";
  heroId: string;
  heroName: string;
  targetTabPath: string[];
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
```

Важно:
- standalone-выгрузка билдера содержит `targetTabPath`; после размещения в `HeroBuildSet` committed leaf хранит вложенный `DivinityBranchBuildExport` без этого поля;
- `progress` и `activeNodes` сохраняются в JSON и не участвуют в интерактивной проверке незавершённой формы; при чтении готового Supabase payload runtime-схема проверяет диапазоны, tree-template paths и точное соответствие производного `activeNodes` значению `progress`;
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

Кнопка `Проверить JSON` ([DownloadJsonButton](../src/features/admin/components/DownloadJsonButton.tsx)) запускает валидацию и показывает список ошибок.

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
- загрузку, серверный черновик, атомарную публикацию и полный JSON-экспорт.

Новые секции этого экрана дописываются сюда и не получают отдельный постоянный spec.

## Authentication And Backend Boundary

Административная сессия признаётся только для Supabase-пользователя, у которого `app_metadata.role === "admin"`. Стабильный контракт сессии содержит `id`, `email` и литеральную роль `admin`. Обычная authenticated-сессия не открывает билдер и не даёт доступ к server draft/published данным. Если password login успешен, но admin claim отсутствует, клиент через публичный `signOut({ scope: "local" })` пытается удалить созданную локальную сессию и независимо от результата показывает `Недостаточно прав администратора.`; восстановленная non-admin сессия считается отсутствующей административной сессией. `auth-js` не предоставляет публичного force-clear API: при ошибке local sign-out клиент всё равно не создаёт `AdminSession`, а RLS не допускает non-admin JWT к защищённым данным.

`AdminAuthPanel` поддерживает вход и выход, состояния pending и видимые success/error toast. Если Supabase не настроен, серверное действие завершается контролируемым `Supabase не настроен.`, а не падением.

Supabase RLS повторяет границу чтения: `draft` доступен только JWT с `app_metadata.role = admin`, без admin claim можно читать только строки `published`. Прямые `insert/update/delete` для `anon` и `authenticated` отозваны; даже admin-клиент выполняет lifecycle-запись только через узкие `SECURITY DEFINER` RPC. Каждая RPC независимо проверяет точный `app_metadata.role === "admin"`, ожидаемое исходное состояние строки и число затронутых строк. Клиентская проверка управляет UI, но не заменяет server boundary; RLS остаётся дополнительной защитой чтения.

## Hero States And Selector

Supabase возвращает ID отдельно по статусам `draft` и `published`, но на каждого героя существует не более одной server-строки. Селектор делит мастер-каталог на взаимоисключающие группы:

- `Не созданы` — нет ни draft, ни published строки;
- `Не опубликованы` — существует draft, но нет published строки;
- опубликованные герои доступны для редактирования опубликованного билда.

Опубликованный герой не должен одновременно оставаться в `Не опубликованы`. Загрузка каталога имеет request identity: поздний ответ закрытого или устаревшего запроса не обновляет экран. Во время загрузки селектор остаётся управляемым, показывает loading, ошибки и повторную попытку.

## Tabs And Local Drafts

Тип и helpers комплекта рекурсивно поддерживают группы вкладок, но текущий UI билдера создаёт и показывает только корневой уровень и один уровень дочерних leaf-вкладок. Каждому leaf соответствует независимый editable draft, индексируемый полным path. Переключение вкладки не переносит значения соседнего leaf.

`Сохранить вкладку` в create/draft workflow:

1. валидирует только текущий leaf;
2. собирает partial `HeroBuildSet` с текущей вкладкой и устойчивыми `heroId`, path и build contract;
3. создаёт или обновляет строку героя в Supabase только как `status: "draft"`; существующую published-строку эта операция не понижает;
4. только после успешного server save фиксирует подготовленный snapshot в локальном собираемом комплекте и обновляет status-каталог;
5. не публикует данные: `published`-строка меняется только отдельным действием публикации.

Повторное сохранение блокируется, пока запрос текущей вкладки не завершён. Устаревший ответ после смены героя/вкладки или закрытия экрана не должен применить snapshot или показать ложный success. Ошибка Supabase сохраняет текущие поля редактирования и показывает backend error, но не выдаёт вкладку за сохранённую.

Полный export собирается только из сохранённых leaf-вкладок. Пустые группы и незавершённые drafts не должны маскироваться как готовый комплект.

## Equipment And Weapon Awakening

- Артефакты и руны хранятся отдельными массивами стабильных IDs; они не образуют пары.
- Варианты принадлежат текущей вкладке, сохраняют порядок добавления и экспортируются как `equipment.artifactIds` и `equipment.runeIds`.
- В каждом массиве нужен хотя бы один вариант; неизвестный или повторный ID блокирует сохранение и export.
- Добавление исключает уже выбранные элементы, удаление одного варианта не меняет второй тип экипировки.
- Пробуждение оружия хранит selections по слотам; бонусы вычисляются из каталога и класса выбранного героя по порогам и правилам из [Hero Builds Spec](hero-builds-spec.md#weapon-awakening).
- Экспорт содержит исходные selections, а не только отображаемый текст бонуса.

## Divinity Skill Loadout

Base и awakened slots редактируются отдельно. Awakened-набор применяется только при включённом состоянии. Дубликаты и несовместимые уровни/ветки блокируются валидацией. Скилл дерева и скилл loadout используют общие стабильные IDs каталога, но являются разными частями build contract.

## Server Drafts And Publication

Таблица `hero_build_sets` хранит для каждого `hero_id` не более одной строки со статусом `draft` или `published`.

- `Сохранить черновик` валидирует полный текущий комплект и создаёт либо обновляет только status `draft`.
- Выбор героя из `Не опубликованы` загружает только его draft через `fetchDraftHeroBuildSet` и восстанавливает редактируемые вкладки.
- Повторная загрузка блокируется, пока предыдущая draft-load операция не завершена.
- Устаревший ответ после выбора другого героя или закрытия селектора не должен менять текущий draft или показывать ложный успех.
- `Опубликовать` вызывает один RPC, который атомарно обновляет payload существующего draft и переводит ту же строку в status `published`.
- Если draft отсутствует, RPC завершает публикацию ошибкой и не создаёт отдельную published-строку.
- После успешной публикации status-каталог обновляется: герой удаляется из draft IDs и добавляется в published IDs.
- В `mode=edit` действия `Сохранить вкладку` и `Опубликовать` передают полный валидный комплект отдельной операции обновления опубликованного payload; они не создают draft и не вызывают переход публикации.
- Опубликованный payload обновляется только отдельной repository-операцией, которая требует исходный status `published` и не меняет его.
- Все три lifecycle-операции repository вызывают отдельные RPC: create/update draft, draft-to-published и update published. Прямой table DML недоступен `anon` и `authenticated`.
- Публичный repository API не содержит операций удаления. Database trigger запрещает удалить published-строку, вернуть её в draft или изменить её `hero_id`.
- Любой draft/published `payload` читается как недоверенный `jsonb` и проходит `heroBuildSetSchema` до восстановления редактора. Несовместимая версия, неверная hero identity, повреждённые tabs/path, неизвестные catalog IDs или несогласованные build-поля дают типизированную `HeroBuildSetRepositoryError(kind: "invalid-data")`, а не частично восстановленный draft.
- Сетевой сбой имеет `kind: "network"`, отсутствие строки остаётся отдельным `null`/`no-data` исходом. Публичный loader может сохранить локальный fallback, но сообщает точную причину через диагностический `onFallback` outcome.
- Загруженный committed leaf обязан быть полным: все major slots и weapon slots заполнены, progress задан для трёх колонок минимум до уровня `18`, major nodes не выше progress, а `activeNodes` точно ему соответствует. Runtime parser ограничен budgets из [Hero Builds Spec](hero-builds-spec.md#backend-payload-boundary), одним рекурсивным проходом проверяет унаследованный `gameMode`, отвергает sparse/accessor arrays, accessor properties, лишние или слишком многочисленные поля, non-plain objects и неканонический UTC `createdAt`.

## Validation And Feedback

Валидация остаётся чистой и возвращает errors с путями. Экран:

- группирует ошибки по секциям;
- показывает не более пяти уникальных сообщений в toast и число скрытых;
- прокручивает к первой проблемной секции;
- очищает относящиеся к полю ошибки после исправления;
- блокирует export/save/publish неполного комплекта.

Backend success не должен жить дольше актуальной операции или выбранного героя. Loading, error, empty и retry состояния являются частью контракта, а не временным служебным UI.

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
10. Вкладки независимы по полному path; data contract и helpers рекурсивны, а текущий builder UI создаёт не более двух отображаемых уровней.
11. Server build — одна строка на `hero_id`; публикация атомарно переводит эту строку из draft в published.
12. Устаревшие async-ответы не меняют выбранного героя и не показывают ложный успех.
13. Admin-доступ требует `app_metadata.role === "admin"` одновременно на клиентской auth-границе и в Supabase RLS.

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
- считать сохранение одной вкладки публикацией полного комплекта;
- смешивать героев со статусами draft и published в одной группе селектора;
- создавать для одного героя отдельные draft и published строки;
- удалять или понижать до draft опубликованную строку;
- хранить computed-текст бонусов вместо selections и каталогов;
- создавать отдельные постоянные specs для вкладок, экипировки или server drafts этого билдера.

## Verification

Поведение хука и валидации частично покрыто тестами:
- [useDivinityBranchBuilder.test.ts](../src/features/admin/__tests__/useDivinityBranchBuilder.test.ts) — пустой драфт и сборка JSON (включая `progress` и `activeNodes`);
- [validateBranchBuild.test.ts](../src/features/admin/__tests__/validateBranchBuild.test.ts) — валидация и `slugifyFileName`;
- [heroBuildSetSchema.test.ts](../src/features/builds/model/__tests__/heroBuildSetSchema.test.ts) — версия и полная runtime-целостность загруженного комплекта;
- [DivinityBranchBuilderScreen.test.tsx](../src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx) — поведение экрана.
- [heroBuildSetRepository.test.ts](../src/features/builds/api/__tests__/heroBuildSetRepository.test.ts) — draft/published запросы и явные lifecycle-операции;
- [branchBuilderTabs.test.ts](../src/features/admin/__tests__/branchBuilderTabs.test.ts) — структура вкладок и path;
- [multiBuildExport.test.ts](../src/features/admin/__tests__/multiBuildExport.test.ts) — сборка полного комплекта;
- [saveAdminHeroBuildSet.test.ts](../src/features/admin/__tests__/saveAdminHeroBuildSet.test.ts) — единая атомарная операция публикации черновика;
- [heroBuildSetsLifecycleSql.test.js](../src/features/admin/__tests__/heroBuildSetsLifecycleSql.test.js) — структура migration, server trigger и publication RPC;
- [heroGuideSelectorModel.test.ts](../src/features/admin/__tests__/heroGuideSelectorModel.test.ts) — взаимоисключающие списки героев;
- [HeroGuideSelector.test.tsx](../src/features/admin/__tests__/HeroGuideSelector.test.tsx) — loading/error/группы селектора;
- [EquipmentVariantBuilder.test.tsx](../src/features/admin/__tests__/EquipmentVariantBuilder.test.tsx) — варианты экипировки;
- [weaponAwakening.test.ts](../src/features/admin/__tests__/weaponAwakening.test.ts) — selections пробуждения;

Любая правка билдера дерева должна сохранять эти инварианты или осознанно обновлять одновременно код, этот документ и тесты.
