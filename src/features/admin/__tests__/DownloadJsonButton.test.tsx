import { fireEvent, render, screen } from "@testing-library/react-native";

import { DownloadJsonButton } from "../components/DownloadJsonButton";

describe("DownloadJsonButton", () => {
  it("renders only current tab save and publish actions by default", () => {
    const onDownloadFull = jest.fn();
    const onDeleteFull = jest.fn();
    const onLoadFull = jest.fn();
    const onPublishFull = jest.fn();
    const onSaveCurrent = jest.fn();
    const onSaveDraft = jest.fn();

    render(
      <DownloadJsonButton
        errors={[]}
        onDeleteFull={onDeleteFull}
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
    expect(onDeleteFull).not.toHaveBeenCalled();
  });

  it("keeps advanced actions available behind an explicit flag", () => {
    const onDownloadFull = jest.fn();
    const onDeleteFull = jest.fn();
    const onLoadFull = jest.fn();
    const onSaveDraft = jest.fn();

    render(
      <DownloadJsonButton
        errors={[]}
        onDeleteFull={onDeleteFull}
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
    fireEvent.press(screen.getByText("Удалить билд"));

    expect(onDownloadFull).toHaveBeenCalledTimes(1);
    expect(onLoadFull).toHaveBeenCalledTimes(1);
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
    expect(onDeleteFull).toHaveBeenCalledTimes(1);
  });

  it("shows backend status text", () => {
    render(
      <DownloadJsonButton
        backendStatus="Билд опубликован."
        errors={[]}
        onDeleteFull={jest.fn()}
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
        onDeleteFull={jest.fn()}
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

    render(
      <DownloadJsonButton
        errors={[]}
        isPublishPending
        onDeleteFull={jest.fn()}
        onDownloadFull={jest.fn()}
        onLoadFull={jest.fn()}
        onPublishFull={onPublishFull}
        onSaveCurrent={jest.fn()}
        onSaveDraft={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText("Публикуем..."));

    expect(screen.queryByText("Опубликовать")).toBeNull();
    expect(onPublishFull).not.toHaveBeenCalled();
  });
});
