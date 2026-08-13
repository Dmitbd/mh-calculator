import { render, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, Animated, StyleSheet } from "react-native";

import { ScreenLoader } from "../ScreenLoader";

describe("ScreenLoader", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders an accessible full-screen loading state with reserved space", () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(true);

    render(<ScreenLoader label="Загружаем билды" />);

    const loader = screen.getByRole("progressbar", {
      name: "Загружаем билды",
    });
    expect(screen.getByText("Загружаем билды")).toBeTruthy();
    expect(StyleSheet.flatten(loader.props.style)).toEqual(
      expect.objectContaining({ flex: 1, minHeight: 240 }),
    );
  });

  it("supports a stable inline loading area", () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(true);

    render(<ScreenLoader label="Обновляем каталог" mode="inline" />);

    expect(
      StyleSheet.flatten(screen.getByTestId("screen-loader").props.style),
    ).toEqual(expect.objectContaining({ minHeight: 96 }));
  });

  it("keeps the themed mark static when reduced motion is enabled", async () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(true);
    const loop = jest.spyOn(Animated, "loop");

    render(<ScreenLoader label="Загрузка" />);

    await waitFor(() => {
      expect(loop).not.toHaveBeenCalled();
    });
    expect(screen.getByTestId("screen-loader-mark")).toBeTruthy();
  });

  it("starts and cleans up its animation when motion is allowed", async () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(false);
    const start = jest.fn();
    const stop = jest.fn();
    jest
      .spyOn(Animated, "loop")
      .mockReturnValue({ start, stop } as unknown as Animated.CompositeAnimation);

    const view = render(<ScreenLoader label="Загрузка" />);

    await waitFor(() => {
      expect(start).toHaveBeenCalledTimes(1);
    });

    view.unmount();

    expect(stop).toHaveBeenCalledTimes(1);
  });
});
