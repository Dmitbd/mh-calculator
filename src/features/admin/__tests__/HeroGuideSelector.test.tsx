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
  fireEvent.press(screen.getByLabelText("Выбрать героя"));

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
  fireEvent.press(screen.getByLabelText("Выбрать героя"));

  fireEvent.press(screen.getByLabelText(`Герой ${urHero.name.ru} выбран`));

  expect(props.onSelectHero).not.toHaveBeenCalled();
  expect(screen.getByText("UR")).toBeTruthy();
});

it("shows loading, retryable error, and empty states", () => {
  const { rerender } = render(<HeroGuideSelector {...props} isLoading />);
  expect(
    screen.getByText("Загружаем доступных героев...").props
      .accessibilityLiveRegion,
  ).toBe("polite");

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

it("keeps only the selected hero visible while availability is loading", () => {
  render(
    <HeroGuideSelector
      {...props}
      isLoading
      selectedHeroId={ssrHero.id}
    />,
  );

  expect(screen.getByText("Загружаем доступных героев...")).toBeTruthy();
  expect(screen.getByLabelText(`Герой ${ssrHero.name.ru} выбран`)).toBeTruthy();
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
