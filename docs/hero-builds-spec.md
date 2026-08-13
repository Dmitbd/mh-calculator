# Hero Builds Spec

Этот документ фиксирует текущую продуктовую и техническую логику пользовательской функции `Билды героев`. Он объединяет каталог героев и экран конкретного билда. Новые фильтры, вкладки и секции билда дописываются сюда, а не получают отдельный spec.

## Scope

Функция реализует:

- список героев, для которых есть локальный или опубликованный в Supabase билд;
- фильтрацию по фракции, редкости и роли;
- группировку результатов по игровым зонам;
- загрузку опубликованного комплекта билда по стабильному `heroId`;
- верхнеуровневые и вложенные вкладки вариантов билда;
- показ артефактов, рун, пробуждения оружия и его бонусов;
- показ базовых и пробуждённых скиллов божественности;
- read-only дерево выбранных веток и прогресса;
- действие `Редактировать` для авторизованного администратора.

Функция не реализует редактирование непосредственно на пользовательском экране: изменение открывает `/admin/branch-builder`. Пользовательский экран не создаёт новые билды и не записывает локальные черновики.

## Routes

- `/heroes` — каталог доступных героев;
- `/heroes/[heroId]` — просмотр комплекта билдов героя;
- переход на `/admin/branch-builder?heroId=<id>&mode=edit` доступен авторизованному администратору.

Навигация назад использует историю, а при её отсутствии возвращается в `/` или `/heroes` через [ScreenHeader](../src/shared/ui/ScreenHeader.tsx).

## Source Files

Основные точки реализации:

- [app/heroes/index.tsx](../app/heroes/index.tsx)
- [app/heroes/[heroId].tsx](../app/heroes/[heroId].tsx)
- [HeroSelectScreen.tsx](../src/features/heroes/screens/HeroSelectScreen.tsx)
- [HeroBuildScreen.tsx](../src/features/heroes/screens/HeroBuildScreen.tsx)
- [HeroListFiltersPanel.tsx](../src/features/heroes/components/HeroListFiltersPanel.tsx)
- [heroListFilters.ts](../src/features/heroes/utils/heroListFilters.ts)
- [heroListGrouping.ts](../src/features/heroes/utils/heroListGrouping.ts)
- [heroBuildTabs.ts](../src/features/heroes/model/heroBuildTabs.ts)
- [heroBuildLoading.ts](../src/features/heroes/model/heroBuildLoading.ts)
- [mapBuildToView.ts](../src/features/heroes/utils/mapBuildToView.ts)
- [heroBuildSetRepository.ts](../src/features/builds/api/heroBuildSetRepository.ts)
- [ScreenLoader.tsx](../src/shared/ui/ScreenLoader.tsx)
- [AppImage.tsx](../src/shared/ui/AppImage.tsx)
- [imagePreload.ts](../src/shared/lib/imagePreload.ts)
- [heroCriticalImages.ts](../src/features/heroes/utils/heroCriticalImages.ts)
- [boundedRequest.ts](../src/shared/lib/boundedRequest.ts)
- [dataBootstrap.ts](../src/shared/lib/dataBootstrap.ts)
- [sourceSelection.ts](../src/shared/lib/sourceSelection.ts)
- [heroBuildSnapshot.ts](../src/features/builds/data/heroBuildSnapshot.ts)
- [heroBuildSnapshotRemote.ts](../src/features/builds/data/heroBuildSnapshotRemote.ts)
- [heroBuildSnapshotSource.ts](../src/features/builds/data/heroBuildSnapshotSource.ts)
- [heroBuildSnapshotStorage.ts](../src/features/builds/storage/heroBuildSnapshotStorage.ts)
- [bundled snapshot manifest](../src/features/game-data/snapshots/hero-builds/manifest.json)
- [snapshot update workflow](../.github/workflows/update-hero-build-snapshot.yml)
- [snapshot RPC migration](../supabase/migrations/20260813200000_add_published_hero_builds_snapshot_rpc.sql)
- [bootstrap/index.ts](../supabase/functions/bootstrap/index.ts)
- [bootstrap/manifest.ts](../supabase/functions/bootstrap/manifest.ts)
- [atomic bootstrap manifest migration](../supabase/migrations/20260813180000_add_atomic_bootstrap_manifest_rpc.sql)
- [public hero-build read grant migration](../supabase/migrations/20260813190000_grant_hero_build_sets_read.sql)
- [heroes.json](../src/features/game-data/heroes/heroes.json)
- [heroBuilds.ts](../src/features/game-data/heroes/heroBuilds.ts)
- [heroBuildTabs.ts](../src/features/game-data/heroes/heroBuildTabs.ts)
- [EquipmentVariantTabs.tsx](../src/features/builds/components/EquipmentVariantTabs.tsx)
- [weapon-awakening-combos.json](../src/features/game-data/weapon-awakening/weapon-awakening-combos.json)
- [weaponAwakeningBonuses.ts](../src/features/game-data/weapon-awakening/weaponAwakeningBonuses.ts)
- [resolveWeaponAwakeningBonuses.ts](../src/features/game-data/weapon-awakening/resolveWeaponAwakeningBonuses.ts)
- [WeaponAwakeningBonusList.tsx](../src/features/builds/components/WeaponAwakeningBonusList.tsx)

## Hero Catalog Contract

`heroes.json` — мастер-каталог метаданных. Готовность билда не должна кодироваться наличием героя в мастер-каталоге.

Стабильный `hero.id` используется:

- в маршруте;
- в локальных build-файлах;
- в строках Supabase `hero_build_sets`;
- в путях портретов `/img/heroes/<hero-id>.png`;
- при редактировании.

Отображаемые русские названия и словари не являются идентификаторами. Каноническое исправление `nephyths → nephthys` уже применено к каталогу, ассету и сохранённым payload; совместимый alias не поддерживается.

## Catalog Availability And Loading

Экран `/heroes` выбирает один источник доступности через явное состояние `checking | remote | fallback`:

1. если Supabase настроен, первый render синхронно находится в `checking`, показывает общий `ScreenLoader` и не вычисляет карточки из локального каталога или resource-запрос;
2. один GET к repository-owned Supabase Edge Function `/bootstrap` с настраиваемым timeout по умолчанию `8` секунд подтверждает backend и manifest: `status: "ok"`, ограниченные `contentVersion`, стабильный server-derived `contentUpdatedAt`, `schemaVersion: 1`, не более `16` resource manifests и обязательный `heroBuilds.version + sha256 etag`;
3. только после совместимого bootstrap выполняется единственное чтение полного `heroBuilds` snapshot; его успех переводит экран в `remote`, а каталог строится из IDs этого же атомарно принятого набора без отдельного запроса IDs и без примеси `heroesWithBuilds`;
4. полный remote snapshot проверяет bootstrap metadata, count, уникальные hero IDs, checksum точного SQL-generated UTF-8 текста и каждый payload общей total resource-bounded схемой; timeout, partial/mismatch, network/HTTP error, слишком большой или невалидный JSON выбирают самый новый совместимый LKG, затем generated bundled snapshot;
5. если Supabase не настроен, `fallback` выбирается синхронно без лишнего промежуточного render.

Совместимый bootstrap кэшируется на сессию и дедуплицирует параллельные callers; fallback-результат не кэшируется навсегда, а явный retry выполняет `force`-перепроверку. Каталог и экран билда используют общую машину `sourceSelection` для переходов bootstrap и hero-build resource, поэтому повторная попытка является фоновой: уже показанный remote или fallback каталог остаётся видимым, а встроенный loader не заменяет его пустым состоянием. Полный snapshot loader сам ограничен `8` секундами и отменяет свой streaming fetch через `AbortSignal`; экран дополнительно игнорирует поздний ответ после unmount, смены route или более нового запроса. Неизвестные remote IDs не превращаются в героев.

Bootstrap body ограничен по фактическим UTF-8 байтам. Streaming-ответ отменяет reader при превышении budget до освобождения lock. Для runtime без streaming body клиент требует корректный ограниченный `Content-Length`, не вызывает `text()` при отсутствующем, нечисловом или чрезмерном значении и после чтения сверяет заявленную длину с фактической. Edge Function явно возвращает этот CORS-доступный заголовок для JSON-ответов.

Полный snapshot также ограничен до JSON parse: внешний PostgREST body — `4 MiB`, внутренний SQL text — `1.5 MiB`, чтобы даже худшее повторное экранирование кавычек и обратных слешей оставалось внутри внешнего budget. Его строгий manifest содержит `schemaVersion: 1`, `contentVersion`, стабильный backend `contentUpdatedAt` и SHA-256 checksum `hero-builds.json`. Canonical JSON сортирует object keys и hero IDs, поэтому одинаковые данные и server date дают byte-identical файлы. Bundled runtime передаёт строгому parser точные JSON-представления импортированных manifest и resource, не восстанавливая доверенный manifest из их полей.

LKG хранится через AsyncStorage неизменяемыми поколениями. На каждом чтении storage перечисляет не более `512` ключей и `32` поколений, полностью проверяет пары manifest/resource и выбирает максимум по total order `(contentUpdatedAt, contentVersion, checksum)`; pointer является только подсказкой и восстанавливается на найденный максимум. Поэтому повреждённый/stale pointer и гонка независимых JS contexts не понижают наблюдаемый snapshot, несмотря на отсутствие межпроцессного CAS в AsyncStorage. После успешной проверки сохраняются четыре наиболее свежих поколения, а повреждённые и более старые удаляются при наличии `removeItem`; переполнение budget или ошибка enumeration закрываются безопасным переходом к bundled snapshot. Запись сначала сохраняет и перечитывает полную immutable-пару, затем повторно сканирует максимум и только после этого чинит pointer.

`scripts/export-hero-build-snapshot.cjs` получает опубликованный resource только через env-конфигурацию, не печатает URL/key, проверяет payload, IDs и `/img` assets до замены полного staged-комплекта. Manual/scheduled workflow использует actions по immutable SHA, dedicated branch с явным lease на exact fetched remote SHA и только открытый PR `head/base`; закрытый PR не переиспользуется. Workflow никогда не пишет напрямую в `main`, а ownership его кода и generated snapshot закреплён в `.github/CODEOWNERS`.

После выбора источника мастер-каталог фильтруется по выбранным признакам и группируется по зонам. Пустой результат показывает `Нет героев с готовыми билдами по выбранным фильтрам.`

Иконки фильтров и metadata только первых четырёх видимых карточек образуют ограниченный above-fold preload-набор. После дедупликации он укладывается в общий лимит `24`; реестр ограничен по размеру, не вытесняет незавершённые запросы и не загружает весь мастер-каталог. Если все слоты заняты незавершёнными запросами, новый критический URL дедуплицированно ожидает освобождения слота и только после собственной попытки завершает `preload`; параллельные callers не создают повторный fetch. При первом принятом источнике каталог показывает общий loader до завершения попытки preload критического набора, но не дольше `3` секунд; below-fold изображения в gate не входят. Смена фильтров, retry или фоновая смена remote/fallback-источника обновляет preload-набор, но не скрывает уже показанный контент.

## Filters And Grouping

Фильтры используют стабильные IDs словарей:

- фракция;
- редкость;
- роль.

Пустое значение означает «не ограничивать». Несколько активных групп фильтров применяются совместно. Группировка не меняет порядок внутри зоны произвольно; правила находятся в `heroListGrouping.ts`. Отображаемая зона и подписи берутся из словарей, а не собираются из ID.

## Build Loading And Fallback

На `/heroes/[heroId]`:

1. герой ищется в мастер-каталоге;
2. локальный `getHeroBuildSet(heroId)` становится fallback;
3. при настроенном Supabase экран сначала принимает совместимый bootstrap, и только затем через тот же ограниченный `8` секундами full-resource snapshot выбирает комплект героя;
4. отсутствие героя в полностью принятом удалённом snapshot сохраняет контролируемое пустое значение для него, а failure всего ресурса выбирает LKG или bundled fallback;
5. неизвестный `heroId` показывает `Герой не найден.`;
6. отсутствие готового билда показывает контролируемое пустое состояние, а не частично собранные секции.

При настроенном Supabase первоначальная загрузка комплекта показывает общий `ScreenLoader` и не раскрывает bundled билд до завершения bootstrap и выбора remote/fallback ресурса. Смена route `heroId` атомарно сбрасывает комплект и active tab path до render нового заголовка и игнорирует поздний ответ прежнего ресурса; принятый комплект и его валидный default path также фиксируются одной state transition без промежуточного empty-state. Без клиента локальный комплект доступен сразу, а `not-configured` диагностируется тем же контролируемым сообщением ровно один раз на загрузку героя. Loader не имеет искусственной минимальной задержки и исчезает при любом контролируемом результате; timeout или неожиданное отклонение promise возвращает локальный fallback без unhandled rejection. Причина контролируемого fallback логируется только как стабильные `heroId` и `kind` (`not-configured | no-data | network | conflict | invalid-data | timeout | http | incompatible-schema | invalid-body`), без сырого backend error или пользовательских данных.

Edge Function использует `SUPABASE_ANON_KEY` и одним вызовом обращается к узкому SQL RPC `get_published_hero_builds_bootstrap_manifest`. `SECURITY INVOKER`, явный `status = 'published'` и действующая публичная RLS policy исключают service-role bypass и draft/private данные. Внутри одного database snapshot RPC агрегирует полный набор `hero_id`, `revision` и UTC `updated_at`; manifest возвращает также стабильный максимум `contentUpdatedAt`. Полный payload выдаёт отдельный RLS-preserving RPC с DB-side лимитом `1000`, а клиент принимает его только при полном совпадении count/version/etag/date с bootstrap. Список IDs или один detail payload не могут создать LKG с global manifest; удалённые герои исчезают только вместе с новым полным snapshot. Bootstrap остаётся единственной проверкой доступности: внешнего ping или `navigator.onLine` нет.

Fresh migration chain явно выдаёт table-level `SELECT` на `hero_build_sets` ролям `anon, authenticated`, чтобы `SECURITY INVOKER` RPC и существующие публичные repository reads были работоспособны независимо от hosted defaults. RLS по-прежнему пропускает им только `published`, а прямые `insert/update/delete` остаются отозваны.

Удалённые данные не должны мутировать локальные каталоги. Сетевые и Supabase-ошибки не должны скрывать корректный LKG или bundled комплект. Невалидный или частичный remote payload не принимается и не сохраняется; viewer различает внутренний deadline snapshot loader как `timeout`, а остальные transport failures как `network`, не логируя сырой backend error.

`ScreenLoader` имеет полноэкранный и встроенный режимы с зарезервированной высотой, ролью `progressbar` и видимой подписью. Анимация построена на React Native `Animated`, останавливается при unmount, а при системном reduced motion остаётся статичной.

После выбора `heroId` экран отдельно предзагружает только portrait, rarity, role, factions и element выбранного героя и до завершения этой ограниченной попытки, но не дольше `3` секунд, показывает общий loader вместо основного содержимого нового героя. Все эти URL проходят через `resolveAssetUri`, поэтому production web использует `/mh-calculator/img/...`, а native — настроенный `assetOrigin`.

`AppImage` сохраняет конечные `width`, `height` и `borderRadius` до завершения fetch/decode, использует platform cache (`force-cache`, где он поддерживается), раскрывает изображение через `onLoad` и оставляет контролируемую заглушку через `onError`. `IconPreview` сохраняет прежние accessibility labels поверх этого boundary; ошибка и отсутствие source не заменяются текстом и не меняют геометрию строки или карточки.

## Build Set And Tabs

Комплект представляет героя и массив `tabs`. Вкладка бывает:

- leaf-вкладкой с `build`;
- группой с `children`, каждый ребёнок которой является leaf-вкладкой.

`HeroBuildTab.children` и model helpers рекурсивны и не ограничивают data contract двумя уровнями. Текущий UI визуализирует верхнюю строку папок и, для активной группы, вторую строку дочерних вкладок; более глубокая навигация пока не представлена. Выбор группы открывает её первый отсортированный leaf. `getDefaultTabPath` выбирает первый доступный готовый билд, а `filterTabsWithReadyBuilds` рекурсивно не показывает пустые вкладки пользователю.

## Backend Payload Boundary

`hero_build_sets.payload` является недоверенным JSON независимо от сгенерированного TypeScript-типа `jsonb`. `fetchPublishedHeroBuildSet` и `fetchDraftHeroBuildSet` передают значение как `unknown` в [heroBuildSetSchema.ts](../src/features/builds/model/heroBuildSetSchema.ts) и возвращают `HeroBuildSet` только после полной проверки.

Runtime-схема проверяет:

- `HeroBuildSet.schemaVersion === 2` и `build.schemaVersion === 1`;
- совпадение каждого `build.heroId` с `hero_id` строки и существование героя в каталоге;
- рекурсивную структуру вкладок, уникальность sibling IDs, устойчивые kebab-case path IDs и наследование `gameMode`;
- отсутствие standalone `targetTabPath` внутри committed leaf;
- известные и непротиворечивые IDs веток, мажорных скиллов, экипировки, loadout-скиллов и пробуждения оружия;
- диапазон `progress`, существование его уровней в tree template и точное соответствие производного `activeNodes`;
- форму metadata, стабильный `source` и корректную дату `createdAt`.

Непустой committed leaf считается полным только когда содержит все `9` major slots из текущего tree template, все `8` слотов пробуждения, progress для `left`, `center`, `right` не ниже `18`, ни один major node не выше progress своей колонки, а `activeNodes` точно производен от progress. Интерактивный draft формы может быть неполным до сохранения, но Supabase payload с неполным leaf не пересекает repository boundary.

Parser остаётся ограниченным текущим `HeroBuildSet` и имеет конечные resource budgets:

| Ресурс | Лимит |
| --- | ---: |
| Глубина дерева вкладок | `8` |
| Вкладки на одном уровне | `32` |
| Вкладки во всём payload | `128` |
| Leaf-вкладки во всём payload | `96` |
| Build nodes во всём payload (`majorNodes + weaponAwakening + activeNodes`) | `8192` |
| Major nodes / active nodes в одном leaf | `16` / `128` |
| Weapon slots / divinity skills в одной полосе | ровно `8` / не более `3` |
| Варианты одного типа экипировки | `16` |
| Общий safety ceiling массива | `128` |
| Длина stable ID / label / прочей строки | `64` / `160` / `256` |
| Собственные keys одного объекта, включая non-enumerable и symbols | `32` |
| Накопленные validation issues | `64` |

Каждый массив обходится по индексам в пределах своего budget: sparse entry не пропускается, accessor не вызывается, и оба получают точный рекурсивный path. Проверка divinity loadout инспектирует не более трёх entries и не запускает aggregate helper после превышения длины. Объекты должны быть plain JSON objects, иметь не более `32` собственных keys, использовать только data properties и содержать только поля текущей версии схемы; `Reflect.ownKeys` включает в проверку non-enumerable string keys и symbols, после чего descriptor inspection ограничен object/issue budget. Accessor, symbol и неизвестное поле отклоняются вместо чтения или молчаливого протаскивания. Строки сначала проверяются по длине и только затем проходят `trim` или regex; `metadata.createdAt` имеет каноническую форму `YYYY-MM-DDTHH:mm:ss.sssZ` и проходит calendar round-trip.

Рекурсивный parser сам полностью проверяет tab invariants и не запускает второй обход `validateHeroBuildTabs`. Для каждого непустого leaf он требует валидный собственный или унаследованный `gameMode`; отсутствие сообщает точный path `<leaf>.gameMode`. Любое неожиданное исключение внутри parser преобразуется в `HeroBuildSetSchemaError`, а row-level `payload` принимается только как обязательное собственное data property. Только `null`/`undefined` самой строки означает `no-data`; строка без `payload`, с унаследованным или accessor `payload` классифицируется repository как `invalid-data`, а не как сеть.

Повреждённые данные приводят к `HeroBuildSetRepositoryError` с `kind: "invalid-data"`; ошибка Supabase — к тому же типу с `kind: "network"`; конфликт revision при административной записи имеет отдельный `kind: "conflict"`; отсутствие строки остаётся отдельным `null`/`no-data` исходом. Невалидный remote не может попасть в Viewer или заменить корректный fallback/будущий last-known-good snapshot.

Порядок и подписи вкладок принадлежат данным комплекта. Компонент просмотра не должен хардкодить режимы `PvP`, `PvE` или их варианты.

## Build Presentation

Выбранный leaf преобразуется `mapBuildToView` в read-only view model. Экран показывает только данные активной вкладки.

### Equipment

- артефакты и руны хранятся как два независимых упорядоченных массива `artifactIds` и `runeIds`;
- варианты не образуют пары: выбор другого артефакта не меняет выбранную руну и наоборот;
- в каждом массиве требуется хотя бы один известный ID, неизвестные и повторяющиеся IDs невалидны;
- порядок из build payload сохраняется; первый элемент становится активным по умолчанию;
- альтернативы переключаются вкладками вариантов, причём каждая строка вариантов управляет только своим описанием;
- пустой слот не подменяется выдуманным предметом;
- описания и `Elemental Resonance` берутся из каталога экипировки, а не сохраняются копией в билде.

### Weapon Awakening

Состояние состоит максимум из восьми слотов с одним из цветов `red`, `yellow`, `green`, `blue`, `purple`. Build payload хранит только исходные selections; активные бонусы вычисляются при отображении через `resolveWeaponAwakeningBonuses`, а не сохраняются готовым текстом.

Класс Iconic Weapon определяется только метаданными героя:

- `tank` → `tank`;
- `support` → `support`;
- `fighter` + `physical` → `physical-fighter`;
- `mage` + `magical` → `magical-fighter`;
- для остальных сочетаний класс равен `null`, поэтому бонусный блок не показывается.

Порог одного цвета выбирается по числу его слотов: `0–1` — бонуса нет, `2–3` — tier `2`, `4–7` — tier `4`, `8` — tier `8`. Несколько цветов активируются независимо и выводятся в порядке `red`, `yellow`, `green`, `blue`, `purple`. Поэтому `2 red + 2 blue` показывает сразу два tier-2 бонуса. Изменение героя пересчитывает описание для его класса без изменения selections.

Текущие числовые значения для порогов `2 / 4 / 8`:

| Класс | Цвет | Эффект | Значения, % |
| --- | --- | --- | --- |
| Tank | red | Parry при HP выше 50% | `4 / 12 / 32` |
| Tank | yellow | меньше входящего physical damage | `6 / 18 / 48` |
| Tank | green | меньше входящего magical damage | `6 / 18 / 48` |
| Tank | blue | меньше Health Bestowal у противника напротив | `4 / 12 / 32` |
| Tank | purple | Defense союзников сзади на ближайших флангах | `4.5 / 13.5 / 36` |
| Physical Fighter | red | Lifesteal при HP ниже 50% | `4.5 / 13.5 / 36` |
| Physical Fighter | yellow | урон по frontline-противникам | `4 / 12 / 32` |
| Physical Fighter | green | меньше входящего урона, пока жив союзный frontline-герой | `3 / 9 / 24` |
| Physical Fighter | blue | больше physical damage по противнику напротив | `4 / 12 / 32` |
| Physical Fighter | purple | Attack союзников на той же линии | `1.5 / 4.5 / 12` |
| Magical Fighter | red | урон по цели с HP выше 50% | `3 / 9 / 24` |
| Magical Fighter | yellow | урон по frontline-противникам | `4 / 12 / 32` |
| Magical Fighter | green | меньше входящего урона, пока жив союзный frontline-герой | `3 / 9 / 24` |
| Magical Fighter | blue | больше magical damage по противнику напротив | `4 / 12 / 32` |
| Magical Fighter | purple | Attack союзников на той же линии | `1.5 / 4.5 / 12` |
| Support | red | Health Bestowal при лечении союзника с HP ниже 50% | `3 / 15 / 40` |
| Support | yellow | меньше входящего physical damage | `6 / 18 / 48` |
| Support | green | меньше входящего magical damage | `6 / 18 / 48` |
| Support | blue | меньше Defense у противника напротив | `8 / 24 / 64` |
| Support | purple | Defense союзников впереди на ближайших флангах | `4.5 / 13.5 / 36` |

Оригинальные английские формулировки эффектов и `{value}`-шаблоны принадлежат `weapon-awakening-combos.json`: UI интерполирует выбранное значение и не переводит термины так, чтобы изменить игровую семантику. Блок скрыт, если нет активного бонуса, и одинаково используется в билдере и read-only экране.

### Divinity Skills And Branches

- base и awakened loadout показываются раздельно;
- awakened-секция скрывается, если в ней нет видимых скиллов;
- выбор веток, мажорных скиллов и прогресс дерева отображаются read-only;
- структура сетки и значения берутся из общих game-data каталогов и build contracts, а не из admin-компонентов.

## Admin Actions

Сессия проверяется через Supabase auth boundary и признаётся административной только при `user.app_metadata.role === "admin"`. Обычный authenticated-пользователь и восстановленная сессия без этого claim считаются неавторизованными для admin-действий. Только при подтверждённой admin-сессии видны:

- `Редактировать` — открывает билдер с `heroId` и `mode=edit`.

Опубликованный билд нельзя удалить из пользовательского экрана или через публичный repository API. Неавторизованный пользователь не должен видеть административную кнопку редактирования.

На уровне Supabase RLS все пользователи могут читать только `published`-строки, а JWT с `app_metadata.role = admin` может читать также `draft`. Прямые `insert/update/delete` для `anon` и `authenticated` отозваны: lifecycle-запись выполняют только отдельные `SECURITY DEFINER` RPC, каждая со своей точной проверкой admin claim, ненулевого authenticated actor, исходного состояния строки и ожидаемой revision. Одного статуса `authenticated` недостаточно. На каждого `hero_id` хранится не более одной строки: `draft` атомарно становится `published`, а опубликованную строку нельзя удалить, перевести обратно в `draft` или перенести на другой `hero_id`. В `mode=edit` полный опубликованный payload обновляется отдельной repository-операцией без создания draft и без смены статуса. Каждое успешное изменение создаёт следующую revision и immutable audit event с предыдущим и новым snapshot; администратор может восстановить опубликованный history snapshot этого же героя только как ещё более новую published revision.

## Asset And Localization Rules

- runtime-ассеты используют стабильные `/img/...` пути и `resolveAssetUri`;
- hero/build IDs — `kebab-case` и не зависят от локализованного текста;
- UI не показывает ID вместо подписи, если словарь существует;
- отсутствие optional-иконки даёт контролируемую заглушку или отсутствие изображения, но не broken URI;
- внешние wiki не используются runtime-экраном.

## Change Guardrails

Без отдельного изменения контракта нельзя:

- показывать в каталоге всех героев вместо героев с готовыми или опубликованными билдами;
- использовать имя героя как ключ маршрута или Supabase;
- смешивать admin-редактирование с read-only экраном;
- возвращать опубликованный билд в черновик или добавлять действие его удаления;
- добавлять в данные глубину, которую текущий UI не умеет однозначно показать, без одновременного обновления навигации и тестов;
- хранить вычисленные бонусы оружия вместо исходных selections;
- связывать артефакты и руны попарно или менять порядок вариантов при чтении;
- определять класс Iconic Weapon по выбранному оружию или UI-подписи;
- скрывать локальный fallback только из-за недоступного Supabase;
- импортировать admin-компоненты или admin-типы в пользовательскую feature.
- принимать `jsonb` как `HeroBuildSet` без runtime-валидации на repository boundary.
- снимать resource budgets или принимать новые поля текущей schema version без явного изменения контракта и тестов.

## Verification

Контракт покрывают:

- [HeroSelectScreen.test.tsx](../src/features/heroes/__tests__/HeroSelectScreen.test.tsx)
- [HeroBuildScreen.test.tsx](../src/features/heroes/__tests__/HeroBuildScreen.test.tsx)
- [ScreenLoader.test.tsx](../src/shared/ui/__tests__/ScreenLoader.test.tsx)
- [heroListFilters.test.ts](../src/features/heroes/__tests__/heroListFilters.test.ts)
- [heroListGrouping.test.ts](../src/features/heroes/__tests__/heroListGrouping.test.ts)
- [heroBuildTabsModel.test.ts](../src/features/heroes/__tests__/heroBuildTabsModel.test.ts)
- [mapBuildToView.test.ts](../src/features/heroes/__tests__/mapBuildToView.test.ts)
- [heroBuildTabs.test.ts](../src/features/game-data/heroes/__tests__/heroBuildTabs.test.ts)
- [heroCatalogDataIntegrity.test.ts](../src/features/game-data/heroes/__tests__/heroCatalogDataIntegrity.test.ts)
- [heroBuildSetRepository.test.ts](../src/features/builds/api/__tests__/heroBuildSetRepository.test.ts)
- [heroBuildSetSchema.test.ts](../src/features/builds/model/__tests__/heroBuildSetSchema.test.ts)
- [dataBootstrap.test.ts](../src/shared/lib/__tests__/dataBootstrap.test.ts)
- [sourceSelection.test.ts](../src/shared/lib/__tests__/sourceSelection.test.ts)
- [bootstrapEdgeFunction.test.js](../src/shared/lib/__tests__/bootstrapEdgeFunction.test.js)
- [bootstrapManifest.test.ts](../src/shared/lib/__tests__/bootstrapManifest.test.ts)
- [bootstrapManifestSql.test.js](../src/shared/lib/__tests__/bootstrapManifestSql.test.js)
- [heroBuildSnapshot.test.ts](../src/features/builds/data/__tests__/heroBuildSnapshot.test.ts)
- [heroBuildSnapshotRemote.test.ts](../src/features/builds/data/__tests__/heroBuildSnapshotRemote.test.ts)
- [snapshotScreenBoundaries.test.js](../src/features/builds/data/__tests__/snapshotScreenBoundaries.test.js)
- [snapshotRpcSql.test.js](../src/features/builds/data/__tests__/snapshotRpcSql.test.js)
- [snapshotWorkflow.test.js](../src/features/builds/data/__tests__/snapshotWorkflow.test.js)
- [heroBuildSnapshotStorage.test.ts](../src/features/builds/storage/__tests__/heroBuildSnapshotStorage.test.ts)
- [bundledHeroBuildSnapshot.test.ts](../src/features/game-data/snapshots/__tests__/bundledHeroBuildSnapshot.test.ts)
- [EquipmentVariantTabs.test.tsx](../src/features/builds/__tests__/EquipmentVariantTabs.test.tsx)
- [WeaponAwakeningBonusList.test.tsx](../src/features/builds/__tests__/WeaponAwakeningBonusList.test.tsx)
- [weaponAwakeningBonuses.test.ts](../src/features/game-data/weapon-awakening/__tests__/weaponAwakeningBonuses.test.ts)

Любая правка каталогов, вкладок или секций билдов обновляет этот документ и соответствующие тесты одновременно.
