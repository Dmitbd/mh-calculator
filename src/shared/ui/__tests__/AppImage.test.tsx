jest.mock("@/shared/lib/resolveAssetUri", () => ({
  __esModule: true,
  resolveAssetUri: (path: string) => `resolved:${path}`,
}));

import {
  act,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import {
  AccessibilityInfo,
  Animated,
  Image,
  StyleSheet,
} from "react-native";

import { AppImage } from "../AppImage";
import {
  ICON_LOADER_DELAY_MS,
  ICON_LOADER_FINISH_MS,
} from "../useImageLoadingTransition";

beforeEach(() => {
  jest.useFakeTimers();
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockReturnValue(new Promise(() => undefined));
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("reserves its final geometry while the image is loading", () => {
  render(
    <AppImage
      accessibilityLabel="Бастет icon"
      borderRadius={18}
      height={36}
      source="/img/heroes/bastet.png"
      testID="hero-image"
      width={36}
    />,
  );

  expect(screen.getByLabelText("Бастет icon")).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByTestId("hero-image").props.style)).toMatchObject({
    borderRadius: 18,
    height: 36,
    width: 36,
  });
  expect(screen.getByTestId("hero-image-placeholder")).toBeTruthy();
  expect(screen.queryByTestId("hero-image-pixel-loader")).toBeNull();

  const image = screen.UNSAFE_getByType(Image);
  expect(image.props.source).toEqual({
    cache: "force-cache",
    uri: "resolved:/img/heroes/bastet.png",
  });
  expect(StyleSheet.flatten(image.props.style).opacity).toBe(0);
});

test("can stay decorative inside an already accessible parent", () => {
  render(
    <AppImage
      accessible={false}
      accessibilityLabel="Decorative reward chest"
      height={52}
      source="/img/antiques/rivalry-chest.png"
      testID="reward-chest"
      width={52}
    />,
  );

  expect(screen.getByTestId("reward-chest").props.accessible).toBe(false);
  expect(screen.getByTestId("reward-chest").props.accessibilityRole).toBeUndefined();
});

test("measures a responsive image before drawing its pixel loader", () => {
  render(
    <AppImage
      accessible={false}
      accessibilityLabel="Responsive weapon color"
      height="100%"
      source="/img/weapon-awakening/red.png"
      testID="responsive-color"
      width="100%"
    />,
  );

  fireEvent(screen.getByTestId("responsive-color"), "layout", {
    nativeEvent: { layout: { height: 34, width: 34, x: 0, y: 0 } },
  });
  act(() => {
    jest.advanceTimersByTime(ICON_LOADER_DELAY_MS);
  });

  expect(
    StyleSheet.flatten(screen.getByTestId("responsive-color").props.style),
  ).toMatchObject({ height: "100%", width: "100%" });
  expect(screen.getByTestId("responsive-color-pixel-loader")).toBeTruthy();
  expect(
    StyleSheet.flatten(
      screen.getByTestId("responsive-color-pixel-loader").props.style,
    ),
  ).toMatchObject({ height: 34, width: 34 });
});

test("reveals a cached-like image before the pixel loader delay", () => {
  render(
    <AppImage
      accessibilityLabel="SSR icon"
      height={20}
      source="/img/hero-rarities/ssr.png"
      testID="rarity-image"
      width={47}
    />,
  );

  fireEvent(screen.UNSAFE_getByType(Image), "load");

  expect(screen.queryByTestId("rarity-image-placeholder")).toBeNull();
  expect(
    StyleSheet.flatten(screen.UNSAFE_getByType(Image).props.style).opacity,
  ).not.toBe(0);
  expect(StyleSheet.flatten(screen.getByTestId("rarity-image").props.style)).toMatchObject({
    height: 20,
    width: 47,
  });
  expect(screen.queryByTestId("rarity-image-pixel-loader")).toBeNull();
});

test("finishes the visible Tetris row before revealing a slow image", async () => {
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockResolvedValue(false);
  const timing = jest.spyOn(Animated, "timing");
  render(
    <AppImage
      accessibilityLabel="Slow hero icon"
      borderRadius={22}
      height={44}
      source="/img/heroes/bastet.png"
      testID="slow-image"
      width={44}
    />,
  );

  await act(async () => undefined);
  act(() => {
    jest.advanceTimersByTime(ICON_LOADER_DELAY_MS);
  });

  expect(screen.getByTestId("slow-image-pixel-loader")).toBeTruthy();
  expect(screen.getAllByTestId("slow-image-falling-cube")).toHaveLength(4);
  expect(screen.getAllByTestId("slow-image-row-cube")).toHaveLength(4);

  fireEvent(screen.UNSAFE_getByType(Image), "load");

  expect(screen.getByTestId("slow-image-finishing-loaded")).toBeTruthy();
  expect(timing).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      duration: ICON_LOADER_FINISH_MS,
      toValue: 1,
      useNativeDriver: true,
    }),
  );

  act(() => {
    jest.advanceTimersByTime(ICON_LOADER_FINISH_MS);
  });

  expect(screen.queryByTestId("slow-image-pixel-loader")).toBeNull();
});

test("keeps a controlled fixed pixel fallback after an image error", () => {
  render(
    <AppImage
      accessibilityLabel="Broken icon"
      height={24}
      source="/img/missing.png"
      testID="broken-image"
      width={24}
    />,
  );

  act(() => {
    jest.advanceTimersByTime(ICON_LOADER_DELAY_MS);
  });
  fireEvent(screen.UNSAFE_getByType(Image), "error");
  act(() => {
    jest.advanceTimersByTime(ICON_LOADER_FINISH_MS);
  });

  expect(screen.getByLabelText("Broken icon")).toBeTruthy();
  expect(screen.getByTestId("broken-image-error")).toBeTruthy();
  expect(screen.getByTestId("broken-image-error-state")).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByTestId("broken-image").props.style)).toMatchObject({
    height: 24,
    width: 24,
  });
});

test("returns to the fixed placeholder when the source changes", () => {
  const view = render(
    <AppImage
      accessibilityLabel="Hero icon"
      height={36}
      source="/img/heroes/bastet.png"
      testID="changing-image"
      width={36}
    />,
  );
  fireEvent(screen.UNSAFE_getByType(Image), "load");

  view.rerender(
    <AppImage
      accessibilityLabel="Hero icon"
      height={36}
      source="/img/heroes/morana.png"
      testID="changing-image"
      width={36}
    />,
  );

  expect(screen.getByTestId("changing-image-placeholder")).toBeTruthy();
  expect(screen.queryByTestId("changing-image-pixel-loader")).toBeNull();
  expect(screen.UNSAFE_getByType(Image).props.source.uri).toBe(
    "resolved:/img/heroes/morana.png",
  );
  expect(StyleSheet.flatten(screen.UNSAFE_getByType(Image).props.style).opacity).toBe(0);
});
