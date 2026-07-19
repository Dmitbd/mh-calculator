import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import heroesData from "@/features/game-data/heroes/heroes.json";
import { heroFactions } from "@/features/game-data/heroes/heroDictionaries";
import type { Hero } from "@/features/game-data/heroes/types";

import { HeroGuideSelector } from "../components/HeroGuideSelector";

const heroes = heroesData as Hero[];
const urHero = heroes.find((hero) => hero.rarity === "ur")!;
const ssrHero = heroes.find((hero) => hero.rarity === "ssr")!;
const multiwordHero = heroes.find((hero) => hero.name.ru === "Ганьцзян и Мое")!;
const options = [ssrHero, urHero];

const props = {
  error: null,
  heroes: options,
  isLoading: false,
  onRetry: jest.fn(),
  onSelectHero: jest.fn(),
  selectedHeroId: null,
};

beforeEach(() => jest.clearAllMocks());

it("renders UR before SSR after expanding", () => {
  const view = render(<HeroGuideSelector {...props} />);
  fireEvent.press(screen.getByLabelText("Выбрать героя"));

  const texts = view.UNSAFE_getAllByType("Text" as never);
  const values = texts.map((node) => node.props.children);
  expect(values.indexOf("UR")).toBeLessThan(values.indexOf("SSR"));
});

it("keeps the narrow chevron when the hero catalog changes state", () => {
  render(<HeroGuideSelector {...props} />);

  const closedChevron = screen.getByTestId("hero-selector-chevron");
  expect(closedChevron.props.children).toBe("›");

  fireEvent.press(screen.getByLabelText("Выбрать героя"));

  const openChevron = screen.getByTestId("hero-selector-chevron");
  expect(openChevron.props.children).toBe("›");
});

it("shows the selected hero portrait and an ellipsized name in the toggle", () => {
  render(<HeroGuideSelector {...props} selectedHeroId={urHero.id} />);

  expect(
    screen.getByLabelText(`Изменить героя: ${urHero.name.ru}`),
  ).toBeTruthy();
  expect(
    screen.getByLabelText(`${urHero.name.ru} selected hero`),
  ).toBeTruthy();
  const selectedName = screen.getByText(urHero.name.ru);
  expect(selectedName.props.ellipsizeMode).toBe("tail");
  expect(selectedName.props.numberOfLines).toBe(1);
  expect(screen.queryByText("Выбрать героя")).toBeNull();
});

it("uses the screen label color for the empty and selected toggle text", () => {
  const view = render(<HeroGuideSelector {...props} />);

  expect(
    StyleSheet.flatten(screen.getByText("Выбрать героя").props.style).color,
  ).toBe("#d6c2a4");

  view.rerender(<HeroGuideSelector {...props} selectedHeroId={urHero.id} />);

  expect(
    StyleSheet.flatten(screen.getByText(urHero.name.ru).props.style).color,
  ).toBe("#d6c2a4");
});

it("joins the expanded toggle and catalog into one bordered panel", () => {
  render(<HeroGuideSelector {...props} />);

  const toggle = screen.getByLabelText("Выбрать героя");
  expect(StyleSheet.flatten(toggle.props.style)).not.toMatchObject({
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  });

  fireEvent.press(toggle);

  expect(
    StyleSheet.flatten(screen.getByLabelText("Выбрать героя").props.style),
  ).toMatchObject({
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  });
  expect(
    StyleSheet.flatten(screen.getByTestId("hero-selector-content").props.style),
  ).toMatchObject({
    backgroundColor: "#241610",
    borderColor: "#644932",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 1,
    padding: 16,
  });
});

it("renders each SSR faction header with its catalog icon and Russian label", () => {
  render(<HeroGuideSelector {...props} />);
  fireEvent.press(screen.getByLabelText("Выбрать героя"));

  const faction = heroFactions.find((entry) =>
    ssrHero.factions.includes(entry.id as never),
  )!;

  expect(screen.getByText(faction.name.ru)).toBeTruthy();
  expect(screen.getByLabelText(`${faction.name.ru} icon`)).toBeTruthy();
});

it("renders a compact square portrait and keeps the check inside it", () => {
  render(<HeroGuideSelector {...props} selectedHeroId={urHero.id} />);
  fireEvent.press(
    screen.getByLabelText(`Изменить героя: ${urHero.name.ru}`),
  );

  const portrait = screen.getByTestId(`hero-portrait-${urHero.id}`);
  const portraitStyle = StyleSheet.flatten(portrait.props.style);
  const imageStyle = StyleSheet.flatten(
    screen.getByLabelText(`${urHero.name.ru} portrait`).props.style,
  );

  expect(portraitStyle).toMatchObject({
    borderRadius: 6,
    height: 56,
    width: 56,
  });
  expect(imageStyle).toMatchObject({
    borderRadius: 6,
    height: 56,
    width: 56,
  });
  expect(within(portrait).getByText("✓")).toBeTruthy();
});

it("uses a 104 by 112 card and allows the hero name to wrap to two lines", () => {
  render(<HeroGuideSelector {...props} />);
  fireEvent.press(screen.getByLabelText("Выбрать героя"));

  const option = screen.getByLabelText(`Выбрать героя ${urHero.name.ru}`);
  const optionStyle = StyleSheet.flatten(option.props.style);
  const name = screen.getByText(urHero.name.ru);

  expect(optionStyle).toMatchObject({ height: 112, width: 104 });
  expect(name.props.numberOfLines).toBe(2);
});

it("wraps a multiword hero name between complete word groups", () => {
  render(<HeroGuideSelector {...props} heroes={[multiwordHero]} />);
  fireEvent.press(screen.getByLabelText("Выбрать героя"));

  expect(screen.getByText("Ганьцзян и Мое").props.children).toBe(
    "Ганьцзян\nи Мое",
  );
});

it("renders a controlled square placeholder when the portrait asset is missing", () => {
  const heroWithoutIcon = { ...urHero, icon: null as never };

  render(<HeroGuideSelector {...props} heroes={[heroWithoutIcon]} />);
  fireEvent.press(screen.getByLabelText("Выбрать героя"));

  expect(
    screen.getByLabelText(`${urHero.name.ru} portrait placeholder`),
  ).toBeTruthy();
});

it("selects a hero, keeps the panel open, and shows a check mark", () => {
  const { rerender } = render(<HeroGuideSelector {...props} />);
  fireEvent.press(screen.getByLabelText("Выбрать героя"));
  fireEvent.press(screen.getByLabelText(`Выбрать героя ${urHero.name.ru}`));
  expect(props.onSelectHero).toHaveBeenCalledWith(urHero.id);

  rerender(<HeroGuideSelector {...props} selectedHeroId={urHero.id} />);
  expect(screen.getByText("UR")).toBeTruthy();
  expect(screen.getByLabelText(`Герой ${urHero.name.ru} выбран`)).toBeTruthy();
});

it("collapses the expanded selector on an explicit second toggle press", () => {
  render(<HeroGuideSelector {...props} />);

  fireEvent.press(screen.getByLabelText("Выбрать героя"));
  expect(screen.getByText("UR")).toBeTruthy();

  fireEvent.press(screen.getByLabelText("Выбрать героя"));
  expect(screen.queryByText("UR")).toBeNull();
});

it("treats a second press on the selected hero as a no-op", () => {
  render(<HeroGuideSelector {...props} selectedHeroId={urHero.id} />);
  fireEvent.press(
    screen.getByLabelText(`Изменить героя: ${urHero.name.ru}`),
  );

  fireEvent.press(screen.getByLabelText(`Герой ${urHero.name.ru} выбран`));

  expect(props.onSelectHero).not.toHaveBeenCalled();
  expect(screen.getByText("UR")).toBeTruthy();
});

it("shows loading, retryable error, and empty states", () => {
  const { rerender } = render(<HeroGuideSelector {...props} isLoading />);
  expect(screen.getByText("Загрузка героев")).toBeTruthy();

  rerender(<HeroGuideSelector {...props} error="failed" />);
  expect(
    screen.getByText("Не удалось загрузить список опубликованных гайдов").props
      .accessibilityLiveRegion,
  ).toBe("polite");
  fireEvent.press(screen.getByText("Повторить"));
  expect(props.onRetry).toHaveBeenCalledTimes(1);

  rerender(<HeroGuideSelector {...props} heroes={[]} />);
  fireEvent.press(screen.getByLabelText("Выбрать героя"));
  expect(screen.getByText("Все герои уже имеют опубликованные гайды")).toBeTruthy();
});

it("keeps an interactive loading header and restores an open catalog", () => {
  const view = render(<HeroGuideSelector {...props} isLoading />);

  expect(screen.getByText("Загрузка героев")).toBeTruthy();
  expect(screen.getByTestId("hero-selector-chevron")).toBeTruthy();

  fireEvent.press(
    screen.getByRole("button", { name: "Загрузка героев" }),
  );

  expect(screen.getByTestId("hero-selector-content")).toBeTruthy();
  expect(screen.getByLabelText("Загрузка списка героев")).toBeTruthy();
  expect(screen.queryByText("UR")).toBeNull();

  view.rerender(<HeroGuideSelector {...props} />);
  expect(screen.getByText("UR")).toBeTruthy();
});

it("does not expose hero options while availability is loading", () => {
  render(
    <HeroGuideSelector
      {...props}
      isLoading
      selectedHeroId={ssrHero.id}
    />,
  );

  expect(screen.getByText("Загрузка героев")).toBeTruthy();
  expect(
    screen.queryByLabelText(`Герой ${ssrHero.name.ru} выбран`),
  ).toBeNull();
  expect(screen.queryByLabelText(`Выбрать героя ${urHero.name.ru}`)).toBeNull();
});

it("keeps only the selected hero visible when availability loading fails", () => {
  render(
    <HeroGuideSelector
      {...props}
      error="failed"
      selectedHeroId={ssrHero.id}
    />,
  );

  expect(
    screen.getByText("Не удалось загрузить список опубликованных гайдов"),
  ).toBeTruthy();
  expect(screen.getByLabelText(`Герой ${ssrHero.name.ru} выбран`)).toBeTruthy();
  expect(screen.queryByLabelText(`Выбрать героя ${urHero.name.ru}`)).toBeNull();
});
