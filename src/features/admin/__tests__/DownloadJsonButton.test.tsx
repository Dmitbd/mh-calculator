import { fireEvent, render, screen } from "@testing-library/react-native";

import { DownloadJsonButton } from "../components/DownloadJsonButton";

describe("DownloadJsonButton", () => {
  it("renders local export and backend save actions", () => {
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
    fireEvent.press(screen.getByText("Скачать полный JSON"));
    fireEvent.press(screen.getByText("Загрузить билд"));
    fireEvent.press(screen.getByText("Сохранить черновик"));
    fireEvent.press(screen.getByText("Опубликовать"));
    fireEvent.press(screen.getByText("Удалить билд"));

    expect(onSaveCurrent).toHaveBeenCalledTimes(1);
    expect(onDownloadFull).toHaveBeenCalledTimes(1);
    expect(onLoadFull).toHaveBeenCalledTimes(1);
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
    expect(onPublishFull).toHaveBeenCalledTimes(1);
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
});
