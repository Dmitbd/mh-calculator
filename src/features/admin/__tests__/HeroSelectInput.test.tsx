import { fireEvent, render, screen } from "@testing-library/react-native";

import heroesData from "@/features/game-data/heroes/heroes.json";
import type { Hero } from "@/features/heroes/types/heroes.types";

import { HeroSelectInput } from "../components/HeroSelectInput";

const heroes = heroesData as Hero[];

describe("HeroSelectInput", () => {
  const defaultProps = {
    heroes,
    heroQuery: "",
    selectedHeroId: null,
    onQueryChange: jest.fn(),
    onSelectHero: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("search by Russian name shows matching hero", () => {
    render(<HeroSelectInput {...defaultProps} heroQuery="бас" />);

    expect(screen.getByText("Бастет")).toBeTruthy();
  });

  it("search by English name shows matching hero", () => {
    render(<HeroSelectInput {...defaultProps} heroQuery="bast" />);

    expect(screen.getByText("Bastet")).toBeTruthy();
  });

  it("search by id shows matching hero", () => {
    render(<HeroSelectInput {...defaultProps} heroQuery="bastet" />);

    expect(screen.getByText("Бастет")).toBeTruthy();
  });

  it("selecting a dropdown option calls onSelectHero", () => {
    const onSelectHero = jest.fn();

    render(
      <HeroSelectInput
        {...defaultProps}
        heroQuery="bastet"
        onSelectHero={onSelectHero}
      />,
    );

    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));

    expect(onSelectHero).toHaveBeenCalledWith("bastet");
  });

  it("arbitrary typed text without selection is not treated as selected", () => {
    render(<HeroSelectInput {...defaultProps} heroQuery="случайный текст" selectedHeroId={null} />);

    expect(screen.getByLabelText("Герой").props.accessibilityState?.selected).not.toBe(true);
  });

  it("shows empty state when no hero matches", () => {
    render(<HeroSelectInput {...defaultProps} heroQuery="zzz-not-found" />);

    expect(screen.getByText("Герой не найден")).toBeTruthy();
  });

  it("shows selected hero state in the input", () => {
    render(
      <HeroSelectInput
        {...defaultProps}
        heroQuery="Бастет"
        selectedHeroId="bastet"
      />,
    );

    expect(screen.getByLabelText("Герой").props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByLabelText("Очистить выбранного героя")).toBeTruthy();
    expect(screen.queryByLabelText("Выбрать героя Бастет")).toBeNull();
  });

  it("hides dropdown after hero is selected", () => {
    render(
      <HeroSelectInput
        {...defaultProps}
        heroQuery="Аполлон"
        selectedHeroId="apollo"
      />,
    );

    expect(screen.queryByLabelText("Выбрать героя Аполлон")).toBeNull();
  });

  it("clear button calls onClearHero", () => {
    const onClearHero = jest.fn();

    render(
      <HeroSelectInput
        {...defaultProps}
        heroQuery="Бастет"
        onClearHero={onClearHero}
        selectedHeroId="bastet"
      />,
    );

    fireEvent.press(screen.getByLabelText("Очистить выбранного героя"));

    expect(onClearHero).toHaveBeenCalledTimes(1);
  });
});
