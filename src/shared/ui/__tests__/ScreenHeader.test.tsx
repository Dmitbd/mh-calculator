import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  replace: jest.fn(),
};

jest.mock("expo-router", () => ({
  __esModule: true,
  router: {
    back: () => mockRouter.back(),
    canGoBack: () => mockRouter.canGoBack(),
    replace: (href: string) => mockRouter.replace(href),
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  __esModule: true,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

import { ScreenHeader } from "../ScreenHeader";

describe("ScreenHeader", () => {
  beforeEach(() => {
    mockRouter.back.mockClear();
    mockRouter.canGoBack.mockClear();
    mockRouter.canGoBack.mockReturnValue(true);
    mockRouter.replace.mockClear();
  });

  it("uses the same two-line typography for short and long titles", () => {
    render(<ScreenHeader title="Builder" />);

    const title = screen.getByText("Builder");
    expect(title.props.numberOfLines).toBe(2);
    expect(StyleSheet.flatten(title.props.style)).toEqual(
      expect.objectContaining({ fontSize: 30, lineHeight: 32 }),
    );
  });

  it("centers a font-independent chevron beside a wrapping title", () => {
    render(<ScreenHeader title="Таланты божественности" />);

    const title = screen.getByText("Таланты божественности");
    expect(title.props.numberOfLines).toBe(2);
    expect(StyleSheet.flatten(title.props.style)).toEqual(
      expect.objectContaining({
        flex: 1,
        minWidth: 0,
        fontSize: 30,
        lineHeight: 32,
      }),
    );
    expect(screen.queryByText("‹")).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByTestId("screen-header-back-chevron").props.style),
    ).toMatchObject({
      borderBottomWidth: 4,
      borderLeftWidth: 4,
      height: 12,
      width: 12,
      transform: [{ rotate: "45deg" }],
    });
  });

  it("stays on the screen when back interception declines navigation", async () => {
    const onBeforeBack = jest.fn(async () => false);

    render(<ScreenHeader onBeforeBack={onBeforeBack} title="Builder" />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Назад"));
    });

    expect(onBeforeBack).toHaveBeenCalledTimes(1);
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("navigates after asynchronous back interception allows it", async () => {
    const onBeforeBack = jest.fn(async () => true);

    render(<ScreenHeader onBeforeBack={onBeforeBack} title="Builder" />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Назад"));
    });

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it("ignores duplicate back presses while confirmation is pending", async () => {
    let resolveConfirmation!: (allowed: boolean) => void;
    const onBeforeBack = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveConfirmation = resolve;
        }),
    );

    render(<ScreenHeader onBeforeBack={onBeforeBack} title="Builder" />);

    fireEvent.press(screen.getByLabelText("Назад"));
    fireEvent.press(screen.getByLabelText("Назад"));

    expect(onBeforeBack).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveConfirmation(true);
    });

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["synchronous", () => {
      throw new Error("confirmation failed");
    }],
    ["asynchronous", async () => {
      throw new Error("confirmation failed");
    }],
  ])("fails closed when the %s back interceptor rejects", async (_kind, interceptor) => {
    render(<ScreenHeader onBeforeBack={interceptor} title="Builder" />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Назад"));
    });

    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not navigate when an allowed interception resolves after unmount", async () => {
    let resolveConfirmation!: (allowed: boolean) => void;
    const onBeforeBack = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveConfirmation = resolve;
        }),
    );
    const view = render(
      <ScreenHeader onBeforeBack={onBeforeBack} title="Builder" />,
    );

    fireEvent.press(screen.getByLabelText("Назад"));
    view.unmount();

    await act(async () => {
      resolveConfirmation(true);
    });

    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
