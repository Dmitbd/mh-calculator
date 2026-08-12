import { act, fireEvent, render, screen } from "@testing-library/react-native";

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
});
