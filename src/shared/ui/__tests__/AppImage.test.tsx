jest.mock("@/shared/lib/resolveAssetUri", () => ({
  __esModule: true,
  resolveAssetUri: (path: string) => `resolved:${path}`,
}));

import { fireEvent, render, screen } from "@testing-library/react-native";
import { Image, StyleSheet } from "react-native";

import { AppImage } from "../AppImage";

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

  const image = screen.UNSAFE_getByType(Image);
  expect(image.props.source).toEqual({
    cache: "force-cache",
    uri: "resolved:/img/heroes/bastet.png",
  });
  expect(StyleSheet.flatten(image.props.style).opacity).toBe(0);
});

test("reveals the image after load without changing the reserved geometry", () => {
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
});

test("keeps a controlled fixed fallback after an image error", () => {
  render(
    <AppImage
      accessibilityLabel="Broken icon"
      height={24}
      source="/img/missing.png"
      testID="broken-image"
      width={24}
    />,
  );

  fireEvent(screen.UNSAFE_getByType(Image), "error");

  expect(screen.getByLabelText("Broken icon")).toBeTruthy();
  expect(screen.getByTestId("broken-image-error")).toBeTruthy();
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
  expect(screen.UNSAFE_getByType(Image).props.source.uri).toBe(
    "resolved:/img/heroes/morana.png",
  );
  expect(StyleSheet.flatten(screen.UNSAFE_getByType(Image).props.style).opacity).toBe(0);
});
