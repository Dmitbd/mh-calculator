# Бэклог MH Calculator

Этот документ хранит согласованные задачи, которые ещё не реализованы. Он не описывает текущее поведение приложения и не заменяет постоянные `docs/*-spec.md` или `CHANGELOG.md`.

При реализации задача переносится из backlog в соответствующий capability spec и `CHANGELOG.md` одновременно с кодом и тестами.

## Загрузка экранов и изображений

### BL-001 — Подтвердить производительность изображений на целевых runtime

**Уже реализовано.** Критические иконки каталога и выбранного героя проходят через ограниченный дедуплицированный preload, а общий `AppImage` сохраняет фиксированную геометрию, platform cache hint и контролируемые loading/error-состояния. Статический production export подтверждает пути `/mh-calculator/...`; локальный HTTP замер отделяет первую передачу от условной cache validation.

**Что осталось проверить и при необходимости усилить:**

- в реальном production web-браузере на GitHub Pages измерить cold и repeat загрузку, transfer/cache behavior и отдельно decode/paint критических PNG через browser Performance API или DevTools;
- на поддерживаемых native runtime измерить cold/repeat network, memory/disk cache и decode/paint на реальном устройстве или репрезентативном эмуляторе;
- сопоставить результаты с performance budgets и E2E/операционными gates Task 14; если измерения покажут регрессию, скорректировать критический набор, timeout или asset format без all-catalog preload;
- сохранить доказательства с окружением, сценарием, количеством/размером URL и явным разделением transfer, cache validation и decode/paint.

**Критерии готовности:**

- есть воспроизводимые cold/repeat измерения для production GitHub Pages и каждого заявленного поддерживаемого native runtime;
- browser/native evidence отдельно описывает network transfer, cache hit/validation и decode/paint, не выводя одно из другого;
- критические иконки не появляются позже основного содержимого в пределах принятого budget, а below-fold изображения не блокируют экран;
- ошибка, offline и зависший preload сохраняют фиксированный placeholder и не удерживают readiness gate бесконечно;
- итоговые budgets и команды проверки закреплены в performance/operational gates.

## Рекомендуемый порядок

1. `BL-001` — runtime-замеры и performance gates изображений после стабилизации источников.
