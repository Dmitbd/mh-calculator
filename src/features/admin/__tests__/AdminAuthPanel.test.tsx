import { fireEvent, render, screen } from "@testing-library/react-native";

import { AdminAuthPanel } from "../components/AdminAuthPanel";

describe("AdminAuthPanel", () => {
  it("submits email and password", () => {
    const onSignIn = jest.fn();

    render(<AdminAuthPanel onSignIn={onSignIn} onSignOut={jest.fn()} />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "admin@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Пароль"), "secret");
    fireEvent.press(screen.getByText("Войти"));

    expect(onSignIn).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "secret",
    });
  });

  it("shows signed in admin and sign out action", () => {
    const onSignOut = jest.fn();

    render(
      <AdminAuthPanel
        adminEmail="admin@example.com"
        onSignIn={jest.fn()}
        onSignOut={onSignOut}
      />,
    );

    expect(screen.getByText("admin@example.com")).toBeTruthy();

    fireEvent.press(screen.getByText("Выйти"));

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("shows a loader while admin auth is pending", () => {
    const onSignIn = jest.fn();

    render(
      <AdminAuthPanel
        isPending
        onSignIn={onSignIn}
        onSignOut={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("Загрузка авторизации")).toBeTruthy();
    expect(screen.getByText("Входим...")).toBeTruthy();

    fireEvent.press(screen.getByText("Входим..."));

    expect(onSignIn).not.toHaveBeenCalled();
  });

  it("shows a loader while admin sign out is pending", () => {
    const onSignOut = jest.fn();

    render(
      <AdminAuthPanel
        adminEmail="admin@example.com"
        isPending
        onSignIn={jest.fn()}
        onSignOut={onSignOut}
      />,
    );

    expect(screen.getByLabelText("Загрузка авторизации")).toBeTruthy();
    expect(screen.getByText("Выходим...")).toBeTruthy();

    fireEvent.press(screen.getByText("Выходим..."));

    expect(onSignOut).not.toHaveBeenCalled();
  });
});
