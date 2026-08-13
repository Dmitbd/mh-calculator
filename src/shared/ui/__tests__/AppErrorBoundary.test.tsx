import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { AppErrorBoundary } from "../AppErrorBoundary";

const originalConsoleError = console.error;
const originalConsoleInfo = console.info;

beforeEach(() => {
  console.error = jest.fn();
  console.info = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.info = originalConsoleInfo;
});

function BrokenScreen(): React.JSX.Element {
  throw new Error("private backend payload");
}

describe("AppErrorBoundary", () => {
  it("shows a controlled recovery view without exposing the thrown error", () => {
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
    const view = render(
      <AppErrorBoundary onGoHome={onGoHome}>
        <BrokenScreen />
      </AppErrorBoundary>,
    );

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

    function HomeScreen() {
      if (homeIsBroken) {
        throw new Error("transient home failure");
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
