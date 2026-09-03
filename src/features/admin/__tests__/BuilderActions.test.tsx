import { fireEvent, render, screen } from "@testing-library/react-native";

import { BuilderActions } from "../components/BuilderActions";

describe("BuilderActions", () => {
  it("shows no edit action for an unchanged published build", () => {
    render(
      <BuilderActions
        mode="edit"
        onPublish={jest.fn()}
        onSaveCurrentTab={jest.fn()}
      />,
    );

    expect(screen.queryByText("Обновить")).toBeNull();
    expect(screen.queryByText("Сохранить вкладку")).toBeNull();
    expect(screen.queryByText("Опубликовать")).toBeNull();
  });

  it("uses the publish callback as the only edit action", () => {
    const onPublish = jest.fn();
    render(
      <BuilderActions
        isDirty
        mode="edit"
        onPublish={onPublish}
        onSaveCurrentTab={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText("Обновить"));

    expect(onPublish).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Сохранить вкладку")).toBeNull();
    expect(screen.queryByText("Опубликовать")).toBeNull();
  });

  it("shows the edit pending label and blocks duplicate updates", () => {
    const onPublish = jest.fn();
    render(
      <BuilderActions
        isDirty
        isPublishPending
        mode="edit"
        onPublish={onPublish}
        onSaveCurrentTab={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText("Обновляем..."));
    expect(onPublish).not.toHaveBeenCalled();
  });

  it("renders only current tab save and publish actions in create mode", () => {
    const onPublish = jest.fn();
    const onSaveCurrentTab = jest.fn();
    render(
      <BuilderActions
        onPublish={onPublish}
        onSaveCurrentTab={onSaveCurrentTab}
      />,
    );

    fireEvent.press(screen.getByText("Сохранить вкладку"));
    fireEvent.press(screen.getByText("Опубликовать"));

    expect(onSaveCurrentTab).toHaveBeenCalledTimes(1);
    expect(onPublish).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Скачать полный JSON")).toBeNull();
    expect(screen.queryByText("Загрузить билд")).toBeNull();
    expect(screen.queryByText("Сохранить черновик")).toBeNull();
  });

  it("shows backend status text", () => {
    render(
      <BuilderActions
        backendStatus="Билд опубликован."
        onPublish={jest.fn()}
        onSaveCurrentTab={jest.fn()}
      />,
    );

    expect(screen.getByText("Билд опубликован.")).toBeTruthy();
  });

  it("blocks both create actions while publishing", () => {
    const onPublish = jest.fn();
    const onSaveCurrentTab = jest.fn();
    render(
      <BuilderActions
        isPublishPending
        onPublish={onPublish}
        onSaveCurrentTab={onSaveCurrentTab}
      />,
    );

    fireEvent.press(screen.getByText("Сохранить вкладку"));
    fireEvent.press(screen.getByText("Публикуем..."));

    expect(onSaveCurrentTab).not.toHaveBeenCalled();
    expect(onPublish).not.toHaveBeenCalled();
  });

  it("blocks both create actions while saving a tab", () => {
    const onPublish = jest.fn();
    const onSaveCurrentTab = jest.fn();
    render(
      <BuilderActions
        isTabSavePending
        onPublish={onPublish}
        onSaveCurrentTab={onSaveCurrentTab}
      />,
    );

    fireEvent.press(screen.getByText("Сохраняем..."));
    fireEvent.press(screen.getByText("Опубликовать"));

    expect(onSaveCurrentTab).not.toHaveBeenCalled();
    expect(onPublish).not.toHaveBeenCalled();
  });
});
