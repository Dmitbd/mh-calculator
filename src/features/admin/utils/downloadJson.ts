/**
 * Скачивает переданные данные как JSON-файл на устройство пользователя.
 * Работает только в web-окружении (Expo web); на нативных платформах ничего не делает.
 */
export function downloadJson(data: unknown, fileName: string): void {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    return;
  }

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
