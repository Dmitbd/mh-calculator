import { act, render, screen } from "@testing-library/react-native";
import { useEffect } from "react";
import { AccessibilityInfo, Text } from "react-native";

import {
  ICON_LOADER_DELAY_MS,
  ICON_LOADER_FINISH_MS,
  type ImageLoadingTransition,
  useImageLoadingTransition,
} from "../useImageLoadingTransition";

let latestTransition: ImageLoadingTransition | null = null;

function TransitionProbe({ uri }: { uri: string | null }) {
  const transition = useImageLoadingTransition(uri);

  useEffect(() => {
    latestTransition = transition;
  }, [transition]);

  return <Text>{transition.phase}</Text>;
}

function currentTransition(): ImageLoadingTransition {
  if (!latestTransition) {
    throw new Error("Transition probe has not rendered.");
  }

  return latestTransition;
}

describe("useImageLoadingTransition", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    latestTransition = null;
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockReturnValue(new Promise(() => undefined));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("reveals a cached-like image without flashing the pixel loader", () => {
    render(<TransitionProbe uri="resolved:/img/a.png" />);

    expect(screen.getByText("pending")).toBeTruthy();

    act(() => {
      currentTransition().handleLoad("resolved:/img/a.png");
    });

    expect(screen.getByText("loaded")).toBeTruthy();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("finishes a visible loading cycle before revealing the image", () => {
    render(<TransitionProbe uri="resolved:/img/a.png" />);

    act(() => {
      jest.advanceTimersByTime(ICON_LOADER_DELAY_MS);
    });
    expect(screen.getByText("animating")).toBeTruthy();

    act(() => {
      currentTransition().handleLoad("resolved:/img/a.png");
    });
    expect(screen.getByText("finishing-loaded")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(ICON_LOADER_FINISH_MS - 1);
    });
    expect(screen.getByText("finishing-loaded")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByText("loaded")).toBeTruthy();
  });

  it("finishes a visible cycle before settling on an error", () => {
    render(<TransitionProbe uri="resolved:/img/missing.png" />);

    act(() => {
      jest.advanceTimersByTime(ICON_LOADER_DELAY_MS);
      currentTransition().handleError("resolved:/img/missing.png");
    });
    expect(screen.getByText("finishing-error")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(ICON_LOADER_FINISH_MS);
    });
    expect(screen.getByText("error")).toBeTruthy();
  });

  it("does not start timers for a missing optional source", () => {
    render(<TransitionProbe uri={null} />);

    expect(screen.getByText("missing")).toBeTruthy();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("ignores callbacks and timers that belong to a previous URI", () => {
    const view = render(<TransitionProbe uri="resolved:/img/a.png" />);

    act(() => {
      jest.advanceTimersByTime(ICON_LOADER_DELAY_MS);
    });
    expect(screen.getByText("animating")).toBeTruthy();

    view.rerender(<TransitionProbe uri="resolved:/img/b.png" />);
    expect(screen.getByText("pending")).toBeTruthy();

    act(() => {
      currentTransition().handleLoad("resolved:/img/a.png");
      jest.advanceTimersByTime(ICON_LOADER_FINISH_MS);
    });

    expect(screen.getByText("animating")).toBeTruthy();
  });

  it("clears all loading and finishing timers on unmount", () => {
    const view = render(<TransitionProbe uri="resolved:/img/a.png" />);

    act(() => {
      jest.advanceTimersByTime(ICON_LOADER_DELAY_MS);
      currentTransition().handleLoad("resolved:/img/a.png");
    });
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    view.unmount();

    expect(jest.getTimerCount()).toBe(0);
  });

  it("does not let a stale motion snapshot override a newer event", async () => {
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

    render(<TransitionProbe uri="resolved:/img/a.png" />);

    act(() => {
      handleMotionChange(true);
    });
    expect(currentTransition().prefersReducedMotion).toBe(true);

    await act(async () => {
      resolveSnapshot(false);
    });

    expect(currentTransition().prefersReducedMotion).toBe(true);
  });
});
