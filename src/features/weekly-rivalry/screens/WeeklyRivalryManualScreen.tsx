import type { Href } from "expo-router";

import type { WeeklyRivalryEventConfig } from "@/features/game-data/weekly-rivalry";
import { CalculatorManualScreen } from "@/shared/ui/CalculatorManualScreen";

type WeeklyRivalryManualScreenProps = {
  config: WeeklyRivalryEventConfig;
  fallbackHref: Href;
};

export function WeeklyRivalryManualScreen({
  config,
  fallbackHref,
}: WeeklyRivalryManualScreenProps) {
  const { singular, singularTitle, pluralTitle } = config.spendResourceForms;

  return (
    <CalculatorManualScreen
      fallbackHref={fallbackHref}
      intro="Калькулятор считает соперничество и задания события по общим исходным ресурсам, а галочки управляют повторным использованием полученных наград."
      sections={[
        {
          title: "Мои ресурсы",
          items: [
            `${pluralTitle} и персональные сундуки еженедельного события являются общими исходными ресурсами для соперничества и заданий.`,
            `1 ${singular} или 1 сундук дают ${config.pointsPerResource} очков соперничества и одно очко задания.`,
          ],
        },
        {
          title: "Галочки кешбэка",
          items: [
            "Все четыре галочки выключены по умолчанию и после сброса расчёта.",
            `Кешбэк соперничества повторно учитывает основной ресурс из наград шкалы: «${singularTitle}».`,
            `Кешбэк персонального сундука считает каждый полученный сундук как 1 ${singular}.`,
            `Кешбэк заданий повторно учитывает основной ресурс из наград выполненных заданий: «${singularTitle}».`,
          ],
        },
        {
          title: "Общий кешбэк",
          items: [
            "Когда общий кешбэк выключен, каждый включённый источник влияет только на свою зону.",
            "Когда общий кешбэк включён, активные источники взаимно продвигают обе зоны до остановки каскада.",
            "Каждая награда учитывается в каскаде только один раз.",
            "Сводки кешбэка по-прежнему показывают награды отдельно для соперничества и заданий.",
          ],
        },
        {
          title: "Сброс",
          items: [
            "Кнопка «Сбросить расчёт» очищает оба количества ресурсов и выключает все четыре галочки.",
          ],
        },
      ]}
      title={config.title}
    />
  );
}
