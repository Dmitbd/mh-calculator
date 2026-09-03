import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { AppErrorBoundary } from "../AppErrorBoundary";

const { expectConsoleError } = require(
  "../../../../scripts/testing/consoleGuard.cjs",
);

const brokenScreenError = new Error("private backend payload");

function expectReactBoundaryError(error: Error, componentName: string): void {
  expectConsoleError(
    "%o\n\n%s\n\n%s\n",
    error,
    `The above error occurred in the <${componentName}> component.`,
    "React will try to recreate this component tree from scratch using the error boundary you provided, AppErrorBoundary.",
  );
}

function BrokenScreen(): React.JSX.Element {
  throw brokenScreenError;
}

describe("AppErrorBoundary", () => {
  it("shows a controlled recovery view without exposing the thrown error", () => {
    expectReactBoundaryError(brokenScreenError, "BrokenScreen");
    render(
      <AppErrorBoundary onGoHome={jest.fn()}>
        <BrokenScreen />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /Не удалось открыть экран/,
    );
    expect(screen.queryByText(/private backend payload/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Повторить" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "На главную" })).toBeTruthy();
  });

  it("resets the boundary and delegates safe navigation home", () => {
    const onGoHome = jest.fn();
    expectReactBoundaryError(brokenScreenError, "BrokenScreen");
    const view = render(
      <AppErrorBoundary onGoHome={onGoHome}>
        <BrokenScreen />
      </AppErrorBoundary>,
    );

    expectReactBoundaryError(brokenScreenError, "BrokenScreen");
    fireEvent.press(screen.getByRole("button", { name: "На главную" }));
    expect(onGoHome).toHaveBeenCalledTimes(1);

    view.rerender(
      <AppErrorBoundary onGoHome={onGoHome} resetKey="home">
        <Text>Рабочий экран</Text>
      </AppErrorBoundary>,
    );

    expect(screen.getByText("Рабочий экран")).toBeTruthy();
  });

  it("recovers to healthy home content when navigation keeps resetKey at slash", () => {
    let homeIsBroken = true;
    let view: ReturnType<typeof render>;
    const homeScreenError = new Error("transient home failure");

    function HomeScreen() {
      if (homeIsBroken) {
        throw homeScreenError;
      }
      return <Text>Главная восстановлена</Text>;
    }

    const onGoHome = jest.fn(() => {
      homeIsBroken = false;
      view.rerender(
        <AppErrorBoundary onGoHome={onGoHome} resetKey="/">
          <HomeScreen />
        </AppErrorBoundary>,
      );
    });

    expectReactBoundaryError(homeScreenError, "HomeScreen");
    view = render(
      <AppErrorBoundary onGoHome={onGoHome} resetKey="/">
        <HomeScreen />
      </AppErrorBoundary>,
    );

    fireEvent.press(screen.getByRole("button", { name: "На главную" }));

    expect(onGoHome).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Главная восстановлена")).toBeTruthy();
  });
});
