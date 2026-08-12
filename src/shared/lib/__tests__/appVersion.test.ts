import appConfig from "@app-config";

import packageJson from "../../../../package.json";

import { APP_VERSION, LATEST_RELEASE_URL } from "../appVersion";

test("uses the same application version in Expo and package metadata", () => {
  expect(APP_VERSION).toBe(appConfig.expo.version);
  expect(APP_VERSION).toBe(packageJson.version);
});

test("links version details to the latest GitHub Release", () => {
  expect(LATEST_RELEASE_URL).toBe(
    "https://github.com/Dmitbd/mh-calculator/releases/latest",
  );
});
