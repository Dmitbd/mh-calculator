import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SCREEN_HEADER_HEIGHT, ScreenHeader } from "@/shared/ui/ScreenHeader";

const SCREEN_PADDING = 24;
const CARD_GAP = 16;

type ManualSectionProps = {
  title: string;
  intro?: string[];
  items?: string[];
  footer?: string;
};

function ManualSection({ title, intro, items, footer }: ManualSectionProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {intro?.map((paragraph) => (
        <Text key={paragraph} style={styles.body}>
          {paragraph}
        </Text>
      ))}
      {items?.map((item) => (
        <View key={item} style={styles.listRow}>
          <Text style={styles.listMarker}>•</Text>
          <Text style={[styles.body, styles.listItem]}>{item}</Text>
        </View>
      ))}
      {footer ? <Text style={styles.body}>{footer}</Text> : null}
    </View>
  );
}

export default function DivinityManualScreen() {
  const { top, bottom } = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Инструкция" fallbackHref="/divinity" />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: SCREEN_HEADER_HEIGHT + top + CARD_GAP,
            paddingBottom: SCREEN_PADDING + bottom,
          },
        ]}
      >
        <View style={styles.introCard}>
          <Text style={styles.title}>Как пользоваться калькулятором</Text>
          <Text style={styles.body}>
            Калькулятор показывает, сколько самоцветов божественности каждого
            уровня потребуется для выбранной прокачки.
          </Text>
        </View>
        <ManualSection
          title="Быстрый расчёт"
          items={[
            "1. В поле «От» выберите начальный уровень божественности.",
            "2. В поле «До» выберите уровень, которого хотите достичь.",
            "3. Включите «Автозаполнение», чтобы сразу рассчитать полную стоимость прокачки.",
            "4. Результат появится в блоке «Расход ресурсов».",
          ]}
        />
        <ManualSection
          title="Расчёт с учётом текущего прогресса"
          intro={[
            "Если уровень уже частично заполнен, отключите «Автозаполнение».",
            "Используйте кнопки − и + рядом с кругом божественности:",
          ]}
          items={[
            "+ заполняет одно деление;",
            "после заполнения всех делений следующий шаг переводит на новый уровень;",
            "− отменяет последний заполненный шаг.",
          ]}
          footer="Количество необходимых самоцветов обновляется автоматически."
        />
        <ManualSection
          title="Мои ресурсы"
          intro={[
            "Раскройте блок «Мои ресурсы», чтобы указать уже имеющиеся сундуки и самоцветы. Добавленные ресурсы будут вычтены из итогового расхода.",
          ]}
          items={[
            "Введите количество ресурса от 0 до 999 в поле рядом с его иконкой.",
            "Новое значение попадёт в расчёт только после нажатия на галочку.",
            "Чтобы очистить сохранённое значение, нажмите кнопку с урной.",
            "В разделе «Сундуки» укажите количество сундуков с самоцветами 1–5 и 6–7 уровней.",
            "В разделе «Самоцветы» укажите отдельные самоцветы каждого уровня.",
            "Один сундук используется для получения одного фиксированного набора самоцветов выбранного уровня.",
            "Сначала сундуки закрывают нехватку самоцветов самого низкого доступного уровня.",
            "Сундуки 6–7 уровней сначала используются для самоцветов 6 и 7 уровней. Для более низких уровней они применяются только после учёта сундуков 1–5 уровней.",
            "Количество самоцветов в сундуке фиксировано, поэтому их может оказаться немного больше, чем требуется.",
          ]}
          footer="Кнопка «Сбросить мои ресурсы» удаляет введённые сундуки и самоцветы, но не сбрасывает прогресс прокачки."
        />
        <ManualSection
          title="Сброс прогресса"
          intro={[
            "Кнопка «Сбросить прогресс» возвращает калькулятор к начальному состоянию. Указанные в блоке «Мои ресурсы» значения сбрасываются отдельно.",
          ]}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#140d0b",
  },
  container: {
    flexGrow: 1,
    gap: CARD_GAP,
    paddingHorizontal: SCREEN_PADDING,
    backgroundColor: "#140d0b",
  },
  introCard: {
    gap: 12,
    borderRadius: 18,
    backgroundColor: "#2a160e",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#f3d38a",
  },
  sectionCard: {
    gap: 12,
    borderRadius: 18,
    backgroundColor: "#2a160e",
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f3d38a",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: "#d7c19a",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  listMarker: {
    width: 18,
    fontSize: 16,
    lineHeight: 24,
    color: "#f3d38a",
  },
  listItem: {
    flex: 1,
  },
});
