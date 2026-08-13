import { fireEvent, render, screen } from "@testing-library/react-native";

import { DownloadJsonButton } from "../components/DownloadJsonButton";

describe("DownloadJsonButton", () => {
  it("shows no edit action for an unchanged published build", () => {
    render(
      <DownloadJsonButton
        errors={[]}
        mode="edit"
        onDownloadFull={jest.fn()}
        onLoadFull={jest.fn()}
        onPublishFull={jest.fn()}
        onSaveCurrent={jest.fn()}
        onSaveDraft={jest.fn()}
      />,
    );

    expect(screen.queryByText("Обновить")).toBeNull();
    expect(screen.queryByText("Сохранить вкладку")).toBeNull();
    expect(screen.queryByText("Опубликовать")).toBeNull();
    expect(screen.queryByText("Скачать полный JSON")).toBeNull();
    expect(screen.queryByText("Загрузить билд")).toBeNull();
    expect(screen.queryByText("Сохранить черновик")).toBeNull();
  });

  it("shows one update action for a changed published build", () => {
    const onUpdate = jest.fn();

    render(
      <DownloadJsonButton
        errors={[]}
        isDirty
        mode="edit"
        onDownloadFull={jest.fn()}
        onLoadFull={jest.fn()}
        onPublishFull={onUpdate}
        onSaveCurrent={jest.fn()}
        onSaveDraft={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText("Обновить"));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Сохранить вкладку")).toBeNull();
    expect(screen.queryByText("Опубликовать")).toBeNull();
  });

  it("shows the edit pending label and blocks duplicate updates", () => {
    const onUpdate = jest.fn();

    render(
      <DownloadJsonButton
        errors={[]}
        isDirty
        isPublishPending
        mode="edit"
        onDownloadFull={jest.fn()}
        onLoadFull={jest.fn()}
        onPublishFull={onUpdate}
        onSaveCurrent={jest.fn()}
        onSaveDraft={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText("Обновляем..."));

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("renders only current tab save and publish actions by default", () => {
    const onDownloadFull = jest.fn();
    const onLoadFull = jest.fn();
    const onPublishFull = jest.fn();
    const onSaveCurrent = jest.fn();
    const onSaveDraft = jest.fn();

    render(
      <DownloadJsonButton
        errors={[]}
        onDownloadFull={onDownloadFull}
        onLoadFull={onLoadFull}
        onPublishFull={onPublishFull}
        onSaveCurrent={onSaveCurrent}
        onSaveDraft={onSaveDraft}
      />,
    );

    fireEvent.press(screen.getByText("Сохранить вкладку"));
    fireEvent.press(screen.getByText("Опубликовать"));

    expect(onSaveCurrent).toHaveBeenCalledTimes(1);
    expect(onPublishFull).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Скачать полный JSON")).toBeNull();
    expect(screen.queryByText("Загрузить билд")).toBeNull();
    expect(screen.queryByText("Сохранить черновик")).toBeNull();
    expect(screen.queryByText("Удалить билд")).toBeNull();
    expect(onDownloadFull).not.toHaveBeenCalled();
    expect(onLoadFull).not.toHaveBeenCalled();
    expect(onSaveDraft).not.toHaveBeenCalled();
  });

  it("keeps advanced actions available behind an explicit flag", () => {
    const onDownloadFull = jest.fn();
    const onLoadFull = jest.fn();
    const onSaveDraft = jest.fn();

    render(
      <DownloadJsonButton
        errors={[]}
        onDownloadFull={onDownloadFull}
        onLoadFull={onLoadFull}
        onPublishFull={jest.fn()}
        onSaveCurrent={jest.fn()}
        onSaveDraft={onSaveDraft}
        showAdvancedActions
      />,
    );

    fireEvent.press(screen.getByText("Скачать полный JSON"));
    fireEvent.press(screen.getByText("Загрузить билд"));
    fireEvent.press(screen.getByText("Сохранить черновик"));

    expect(onDownloadFull).toHaveBeenCalledTimes(1);
    expect(onLoadFull).toHaveBeenCalledTimes(1);
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Удалить билд")).toBeNull();
  });

  it("shows backend status text", () => {
    render(
      <DownloadJsonButton
        backendStatus="Билд опубликован."
        errors={[]}
        onDownloadFull={jest.fn()}
        onLoadFull={jest.fn()}
        onPublishFull={jest.fn()}
        onSaveCurrent={jest.fn()}
        onSaveDraft={jest.fn()}
      />,
    );

    expect(screen.getByText("Билд опубликован.")).toBeTruthy();
  });

  it("does not render form validation errors under the footer actions", () => {
    render(
      <DownloadJsonButton
        errors={[
          {
            code: "hero.required",
            message: "Выберите героя из списка.",
            path: "heroId",
          },
        ]}
        onDownloadFull={jest.fn()}
        onLoadFull={jest.fn()}
        onPublishFull={jest.fn()}
        onSaveCurrent={jest.fn()}
        onSaveDraft={jest.fn()}
      />,
    );

    expect(screen.getByText("Сохранить вкладку")).toBeTruthy();
    expect(screen.getByText("Опубликовать")).toBeTruthy();
    expect(screen.queryByText("Выберите героя из списка.")).toBeNull();
  });

  it("shows a loader label and blocks duplicate publish clicks while publishing", () => {
    const onPublishFull = jest.fn();
    const onSaveCurrent = jest.fn();

    render(
      <DownloadJsonButton
        errors={[]}
        isPublishPending
        onDownloadFull={jest.fn()}
        onLoadFull={jest.fn()}
        onPublishFull={onPublishFull}
        onSaveCurrent={onSaveCurrent}
        onSaveDraft={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText("Сохранить вкладку"));
    fireEvent.press(screen.getByText("Публикуем..."));

    expect(screen.queryByText("Опубликовать")).toBeNull();
    expect(onSaveCurrent).not.toHaveBeenCalled();
    expect(onPublishFull).not.toHaveBeenCalled();
  });

  it("shows a loader label and blocks save and publication while saving a tab", () => {
    const onPublishFull = jest.fn();
    const onSaveCurrent = jest.fn();

    render(
      <DownloadJsonButton
        errors={[]}
        isTabSavePending
        onDownloadFull={jest.fn()}
        onLoadFull={jest.fn()}
        onPublishFull={onPublishFull}
        onSaveCurrent={onSaveCurrent}
        onSaveDraft={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText("Сохраняем..."));
    fireEvent.press(screen.getByText("Опубликовать"));

    expect(screen.queryByText("Сохранить вкладку")).toBeNull();
    expect(onSaveCurrent).not.toHaveBeenCalled();
    expect(onPublishFull).not.toHaveBeenCalled();
  });
});
