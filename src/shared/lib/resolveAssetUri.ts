import { Platform } from "react-native";

import appConfig from "@app-config";

const NATIVE_ASSET_ORIGIN =
  process.env.EXPO_PUBLIC_ASSET_ORIGIN ?? appConfig.expo.extra.assetOrigin;

const WEB_BASE_URL = appConfig.expo.experiments.baseUrl ?? "";

/**
 * Приводит абсолютный путь ассета из public/ (например "/img/..") к рабочему URL
 * в текущем окружении: на web — с учётом base path, на нативе — с полным origin.
 */
export function resolveAssetUri(path: string): string {
  // Полные URL оставляем как есть
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const normalizedPath = /^\//.test(path) ? path : `/${path}`;

  if (Platform.OS === "web") {
    if (process.env.NODE_ENV !== "production") {
      return normalizedPath;
    }

    const base = WEB_BASE_URL.replace(/\/$/, "");
    return `${base}${normalizedPath}`;
  }

  return `${NATIVE_ASSET_ORIGIN.replace(/\/$/, "")}${normalizedPath}`;
}
