import { act, render, screen, waitFor } from "@testing-library/react-native";
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

  it("renders the approved lightning pulse composition", () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(true);

    render(<ScreenLoader label="Загрузка" />);

    expect(screen.getByTestId("screen-loader-bolt").props.children).toBe("⚡");
    expect(screen.getByTestId("screen-loader-pulse-ring")).toBeTruthy();
    expect(screen.getAllByTestId("screen-loader-spark")).toHaveLength(2);
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
    const startPulse = jest.fn();
    const stopPulse = jest.fn();
    const startOrbit = jest.fn();
    const stopOrbit = jest.fn();
    jest
      .spyOn(Animated, "loop")
      .mockReturnValueOnce({
        start: startPulse,
        stop: stopPulse,
      } as unknown as Animated.CompositeAnimation)
      .mockReturnValueOnce({
        start: startOrbit,
        stop: stopOrbit,
      } as unknown as Animated.CompositeAnimation);

    const view = render(<ScreenLoader label="Загрузка" />);

    await waitFor(() => {
      expect(startPulse).toHaveBeenCalledTimes(1);
      expect(startOrbit).toHaveBeenCalledTimes(1);
    });

    view.unmount();

    expect(stopPulse).toHaveBeenCalledTimes(1);
    expect(stopOrbit).toHaveBeenCalledTimes(1);
  });

  it("does not let a stale snapshot override a newer reduced-motion event", async () => {
    let resolveSnapshot!: (isEnabled: boolean) => void;
    let handleMotionChange!: (isEnabled: boolean) => void;
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveSnapshot = resolve;
      }),
    );
    jest
      .spyOn(AccessibilityInfo, "addEventListener")
      .mockImplementation(
        ((
          _event: "reduceMotionChanged",
          listener: (isEnabled: boolean) => void,
        ) => {
          handleMotionChange = listener;
          return { remove: jest.fn() } as never;
        }) as unknown as typeof AccessibilityInfo.addEventListener,
      );
    const loop = jest.spyOn(Animated, "loop");

    render(<ScreenLoader label="Загрузка" />);

    act(() => {
      handleMotionChange(true);
    });
    await act(async () => {
      resolveSnapshot(false);
    });

    expect(loop).not.toHaveBeenCalled();
  });
});
