import { fireEvent, render, screen } from "@testing-library/react-native";

import heroesData from "@/features/game-data/heroes/heroes.json";
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

it("selects a hero, keeps the panel open, and shows a check mark", () => {
  const { rerender } = render(<HeroGuideSelector {...props} />);
  fireEvent.press(screen.getByLabelText("Выбрать героя"));
  fireEvent.press(screen.getByLabelText(`Выбрать героя ${urHero.name.ru}`));
  expect(props.onSelectHero).toHaveBeenCalledWith(urHero.id);

  rerender(<HeroGuideSelector {...props} selectedHeroId={urHero.id} />);
  expect(screen.getByText("UR")).toBeTruthy();
  expect(screen.getByLabelText(`Герой ${urHero.name.ru} выбран`)).toBeTruthy();
});

it("shows loading, retryable error, and empty states", () => {
  const { rerender } = render(<HeroGuideSelector {...props} isLoading />);
  expect(screen.getByText("Загружаем доступных героев...")).toBeTruthy();

  rerender(<HeroGuideSelector {...props} error="failed" />);
  expect(screen.getByText("Не удалось загрузить список опубликованных гайдов")).toBeTruthy();
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
