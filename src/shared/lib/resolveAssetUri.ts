import Constants from "expo-constants";
import { Platform } from "react-native";

import appConfig from "@app-config";

const PRODUCTION_ASSET_ORIGIN = appConfig.expo.extra.assetOrigin;
const WEB_BASE_URL = appConfig.expo.experiments.baseUrl ?? "";

/**
 * Origin Metro dev-сервера для загрузки public-ассетов на нативе в разработке.
 * В production нативные клиенты используют assetOrigin из app.json.
 */
function getNativeAssetOrigin(): string {
  if (process.env.EXPO_PUBLIC_ASSET_ORIGIN) {
    return process.env.EXPO_PUBLIC_ASSET_ORIGIN;
  }

  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;

    if (hostUri) {
      return `http://${hostUri}`;
    }
  }

  return PRODUCTION_ASSET_ORIGIN;
}

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

  return `${getNativeAssetOrigin().replace(/\/$/, "")}${normalizedPath}`;
}
