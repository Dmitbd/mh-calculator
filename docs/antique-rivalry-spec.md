# Antique Rivalry Calculator Spec

Этот документ фиксирует текущую продуктовую и техническую логику функции `Антиквариат`. Все дальнейшие поля, награды и режимы этого калькулятора обновляют данный spec, а не создают новый документ.

## Scope

Калькулятор реализует:

- ввод имеющихся монет исследования, карт гробницы и карт храма;
- распределение монет между картами двух типов;
- базовый и каскадный расчёт очков события;
- автоматическое добавление возвращаемых наград в последующие шаги;
- шкалу узлов и крупных порогов до `12 000` очков;
- отображение возврата карт и фрагментов сундуков;
- состояния сундуков соперничества;
- локальное сохранение нормализованного ввода;
- опциональный учёт кешбэка.
- внутреннюю инструкцию по использованию калькулятора.

Калькулятор не обещает live-синхронизацию с сервером игры, несколько профилей или гарантии для серверных hotfix-данных. Он использует проверенный локальный snapshot каталогов.

## Route And Navigation

- маршруты: `/antiques`, `/antiques/manual`;
- вход с главного экрана: `Калькуляторы → Антиквариат`;
- возврат: через общий `ScreenHeader`, fallback `/`.

Основные файлы:

- [app/antiques.tsx](../app/antiques.tsx)
- [app/antiques/manual.tsx](../app/antiques/manual.tsx)
- [AntiqueScreen.tsx](../src/features/antiques/screens/AntiqueScreen.tsx)
- [AntiqueManualScreen.tsx](../src/features/antiques/screens/AntiqueManualScreen.tsx)
- [useAntiqueCalculator.ts](../src/features/antiques/hooks/useAntiqueCalculator.ts)
- [calculateAntiqueRivalry.ts](../src/features/antiques/model/calculateAntiqueRivalry.ts)
- [allocateAntiqueCoins.ts](../src/features/antiques/model/allocateAntiqueCoins.ts)
- [types.ts](../src/features/antiques/model/types.ts)
- [antiqueCalculatorStorage.ts](../src/features/antiques/storage/antiqueCalculatorStorage.ts)
- [game-data/antiques/index.ts](../src/features/game-data/antiques/index.ts)
- [antique-rivalry-rewards.json](../src/features/game-data/antiques/antique-rivalry-rewards.json)
- [InstructionButton.tsx](../src/shared/ui/InstructionButton.tsx)
- [CalculatorManualScreen.tsx](../src/shared/ui/CalculatorManualScreen.tsx)
- [AppImage.tsx](../src/shared/ui/AppImage.tsx)
- [PixelIconLoader.tsx](../src/shared/ui/PixelIconLoader.tsx)

## Input Model

```ts
type AntiqueRivalryInput = {
  coins: unknown;
  templeMapAllocation: unknown;
  ownedTombMaps: unknown;
  ownedTempleMaps: unknown;
  includeCashback?: boolean;
};
```

Это тип входной границы нормализации, поэтому числовые поля намеренно принимаются как `unknown`, а `includeCashback` может отсутствовать. Перед расчётом и сохранением он преобразуется в `AntiqueCalculatorInput` с обязательными числовыми полями и boolean. Числовые значения нормализуются в неотрицательные целые числа. `NaN`, отрицательные, дробные и нечисловые значения не попадают в расчёт как есть. `includeCashback` по умолчанию равен `true`; только явное `false` отключает каскадный возврат.

Монеты тратятся только полными блоками:

- `500` монет → `1` карта гробницы;
- `1000` монет → `1` карта храма;
- остаток меньше `500` хранится как `unusedCoins`;
- `templeMapAllocation` зажимается числом доступных пар по `1000`;
- переключение распределения не меняет исходное количество монет.

## Score Rules

- карта гробницы даёт `30` очков;
- карта храма даёт `60` очков;
- шаг обычного узла — `750`;
- крупные пороги — `3000`, `6000`, `9000`, `12000`;
- максимум события — `12000`.

`baseScore` считается только из распределённых и собственных карт. Затем калькулятор последовательно проходит локальный reward track. Если достигнутый узел возвращает карты, они добавляются в `spentMaps`, увеличивают `totalScore` и могут открыть следующие узлы. Алгоритм заканчивается на первом недоступном узле; награды будущего узла нельзя использовать заранее.

`scoreRemaining` никогда не отрицателен. `openedNodes` считает открытые reward-узлы, `openedMajorChests` — достигнутые крупные пороги.

## Cashback Mode

Переключатель кешбэка управляет тем, участвуют ли возвращаемые ресурсы в итоговом пользовательском представлении расчёта. Изменение режима не должно терять исходные введённые монеты и карты. UI обязан явно отличать исходные ресурсы, распределение и возврат события.

Каскад всегда выполняется последовательно по данным наград; режим нельзя реализовать как одно прибавление всех потенциальных наград.

## UI Contract

Экран содержит связанные блоки:

- собственные монеты и карты;
- распределение монет между картами;
- сводка доступных/потраченных ресурсов;
- прогресс очков;
- шкала наград;
- кешбэк;
- сундуки соперничества.

Кнопки и поля должны иметь доступные названия. Нажатия `+/-` и прямой ввод проходят через одну нормализацию. Нельзя показывать отрицательные карты, монеты или остаток очков.

Reward track показывает открытые, активный следующий и будущие узлы разными состояниями. Сундук крупного порога становится открытым только после фактического достижения порога; активный сундук не должен одновременно выглядеть уже полученным.

### Instruction Route

Перед содержимым калькулятора находится общая кнопка `? Инструкция` с доступным названием «Открыть инструкцию по антиквариату». Она открывает `/antiques/manual` и использует тот же переиспользуемый паттерн инструкции, что и `/divinity/manual`: прокручиваемые карточки с безопасными отступами и общий заголовок `Инструкция`. Кнопка `Назад` возвращает по истории, а если истории нет — заменяет маршрут на `/antiques`.

Инструкция `Антиквариата` обязана объяснять:

- быстрый расчёт из введённых монет и карт, включая `30` очков за карту гробницы и `60` за карту храма;
- распределение монет: `500` на карту гробницы, `1000` на карту храма, неизменность исходного ввода и сохранение остатка меньше `500`;
- кешбэк как последовательный каскад уже открытых наград без использования будущих узлов и возможность отключить его без потери введённых ресурсов;
- шкалу обычных узлов `750`, крупные сундуки `3000/6000/9000/12000`, максимум `12000` и правило фактического получения сундука после порога;
- автоматическое сохранение и восстановление между посещениями нормализованных монет, собственных карт, распределения монет и настройки кешбэка;
- сброс расчёта: сохранённые значения очищаются до нулевых монет и карт, а кешбэк включается.

## Persistence

AsyncStorage key: `antique-rivalry-calculator`.

Сохраняются только нормализованные входы и `updatedAt`:

```ts
type AntiqueCalculatorInput = {
  coins: number;
  templeMapAllocation: number;
  ownedTombMaps: number;
  ownedTempleMaps: number;
  includeCashback: boolean;
};

type AntiqueCalculatorRecord = AntiqueCalculatorInput & {
  updatedAt: string;
};
```

`includeCashback` сохраняется вместе с числовыми полями. Чтение отсутствующего, повреждённого или несовместимого JSON возвращает безопасное пустое состояние с `includeCashback: true`. Ошибка чтения не блокирует экран. Ошибка записи не должна откатывать уже понятное пользователю локальное действие молча; hook сохраняет управляемое состояние ошибки. Reset записывает нулевой нормализованный record с включённым cashback.

## Game Data And Assets

`antique-rivalry-rewards.json` — локальный источник reward track. Константы порогов и максимума находятся рядом с каталогом.

Ресурсы имеют `verification: verified | unresolved`. Проверенные IDs нельзя переносить на unresolved-ресурс по сходству изображения. Текущие подтверждённые ID:

- карта гробницы — `700042`;
- карта храма — `700043`;
- фрагменты легендарного сундука — `700036`;
- фрагменты мифического сундука — `700035`.

Монеты исследования и сундук соперничества остаются `unresolved`, даже если для UI есть локальный PNG. Это разделяет визуальный ассет и доказанный игровой ID.

Если `resource.icon` задан, [AntiqueResourceIcon](../src/features/antiques/components/AntiqueResourceIcon.tsx) использует общий `AppImage`. Он сохраняет размер, после `120` мс заметной загрузки показывает локальный пиксельный ряд и даёт уже видимому движению не более `400` мс на завершение перед плавным раскрытием. Сундуки reward track проходят через тот же boundary, но остаются декоративными внутри доступной карточки сундука. Ошибка становится статичной пиксельной заглушкой, reduced motion не запускает движение. Если иконки нет, сохраняется контролируемая текстовая заглушка с accessibility label. Broken URI и молчаливое использование чужого ID запрещены.

## Failure And Boundary Behavior

- любые входы нормализуются до расчёта и сохранения;
- монеты сверх полного шага остаются неиспользованными, но не исчезают;
- allocation храма не может превысить доступное число пар монет;
- лишние ресурсы не создают отрицательный остаток;
- повреждённое хранилище не роняет маршрут;
- отсутствующая optional-иконка не роняет карточку;
- локальные данные не представляются как гарантия live-сервера.

## Change Guardrails

Без отдельного подтверждённого изменения нельзя:

- менять цены карт `500/1000` или очки `30/60`;
- считать все награды одним проходом без каскада;
- выдавать будущие награды до достижения узла;
- заменять unresolved игровые IDs догадками;
- хранить вычисленный result вместо минимального нормализованного input;
- делать внешний сайт runtime-источником наград;
- плодить отдельные specs для кешбэка, сундука, инструкции или новых полей этого экрана.

## Verification

Контракт покрывают:

- [antiqueModel.test.ts](../src/features/antiques/__tests__/antiqueModel.test.ts)
- [antiqueCalculatorStorage.test.ts](../src/features/antiques/__tests__/antiqueCalculatorStorage.test.ts)
- [useAntiqueCalculator.test.tsx](../src/features/antiques/__tests__/useAntiqueCalculator.test.tsx)
- [AntiqueScreen.test.tsx](../src/features/antiques/__tests__/AntiqueScreen.test.tsx)
- [AntiqueManualScreen.test.tsx](../src/features/antiques/__tests__/AntiqueManualScreen.test.tsx)
- [AntiqueComponents.test.tsx](../src/features/antiques/__tests__/AntiqueComponents.test.tsx)
- [AntiqueResourceIcon.test.tsx](../src/features/antiques/__tests__/AntiqueResourceIcon.test.tsx)
- [antiqueRivalryCatalog.test.ts](../src/features/game-data/antiques/__tests__/antiqueRivalryCatalog.test.ts)
- [HomeScreen.test.tsx](../src/features/home/__tests__/HomeScreen.test.tsx)

Изменение формул, reward data или UI-состояний обновляет этот spec и соответствующие тесты одновременно.
