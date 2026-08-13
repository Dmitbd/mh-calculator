import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page, type Route } from "@playwright/test";

type BackendRole = "admin" | "user";

const snapshot = JSON.parse(
  readFileSync(
    path.join(
      process.cwd(),
      "src/features/game-data/snapshots/hero-builds/hero-builds.json",
    ),
    "utf8",
  ),
) as {
  heroBuilds: Array<{ buildSet: unknown; heroId: string }>;
};
const bastetBuild = snapshot.heroBuilds.find(({ heroId }) => heroId === "bastet");

if (!bastetBuild) {
  throw new Error("Bundled Bastet build is required by operational E2E.");
}
const bastetBuildSet = bastetBuild.buildSet;
const browserErrors = new WeakMap<Page, string[]>();

function utf8Length(value: string): string {
  return String(Buffer.byteLength(value, "utf8"));
}

async function fulfillJson(route: Route, value: unknown, status = 200) {
  const body = JSON.stringify(value);
  await route.fulfill({
    body,
    contentType: "application/json",
    headers: { "Content-Length": utf8Length(body) },
    status,
  });
}

function remoteSnapshotResponse() {
  const heroBuildsText = JSON.stringify([
    { hero_id: "bastet", payload: bastetBuildSet },
  ]);
  const checksum = createHash("sha256").update(heroBuildsText).digest("hex");
  return [
    {
      content_updated_at: "2026-08-13T00:00:00.000000Z",
      etag: `sha256:${"a".repeat(64)}`,
      hero_builds_text: heroBuildsText,
      published_count: 1,
      resource_checksum: `sha256:${checksum}`,
      version: "e2e-v1",
    },
  ];
}

function incompatibleBootstrapResponse() {
  return {
    contentUpdatedAt: "2026-08-13T00:00:00.000000Z",
    contentVersion: "e2e-incompatible",
    resources: {
      heroBuilds: {
        etag: `sha256:${"a".repeat(64)}`,
        version: "e2e-incompatible",
      },
    },
    schemaVersion: 2,
    status: "ok",
  };
}

async function mockRemoteCatalog(page: Page) {
  await page.route("https://e2e.invalid/functions/v1/bootstrap", (route) =>
    fulfillJson(route, {
      contentUpdatedAt: "2026-08-13T00:00:00.000000Z",
      contentVersion: "e2e-v1",
      resources: {
        heroBuilds: {
          etag: `sha256:${"a".repeat(64)}`,
          version: "e2e-v1",
        },
      },
      schemaVersion: 1,
      status: "ok",
    }),
  );
  await page.route(
    "https://e2e.invalid/rest/v1/rpc/get_published_hero_builds_snapshot",
    (route) => fulfillJson(route, remoteSnapshotResponse()),
  );
}

async function mockAuth(page: Page, role: BackendRole) {
  await page.route("https://e2e.invalid/auth/v1/token**", (route) =>
    fulfillJson(route, {
      access_token: `e2e-${role}-access`,
      expires_in: 3600,
      refresh_token: `e2e-${role}-refresh`,
      token_type: "bearer",
      user: {
        app_metadata: { role },
        aud: "authenticated",
        created_at: "2026-08-13T00:00:00.000Z",
        email: `${role}@example.com`,
        id: `${role}-user-id`,
        user_metadata: {},
      },
    }),
  );
  await page.route("https://e2e.invalid/auth/v1/logout**", (route) =>
    route.fulfill({ status: 204 }),
  );
}

async function signIn(page: Page, role: BackendRole) {
  await page.getByPlaceholder("Email").fill(`${role}@example.com`);
  await page.getByPlaceholder("Пароль").fill("e2e-password");
  await page.getByRole("button", { name: "Войти" }).click();
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console.error: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
});

test.afterEach(async ({ page }) => {
  expect(
    browserErrors.get(page) ?? [],
    "operational flow must not emit console.error or pageerror",
  ).toEqual([]);
});

test("initial loader waits for a source before remote catalog content", async ({
  page,
}) => {
  let releaseBootstrap!: () => void;
  await page.route("https://e2e.invalid/functions/v1/bootstrap", async (route) => {
    await new Promise<void>((resolve) => {
      releaseBootstrap = resolve;
    });
    await fulfillJson(route, incompatibleBootstrapResponse());
  });

  await page.goto("/mh-calculator/heroes");

  await expect(page.getByRole("progressbar", { name: "Загружаем билды" })).toBeVisible();
  await expect(page.getByText("Бастет")).toHaveCount(0);
  releaseBootstrap();
  await expect(page.getByText("Показаны локальные билды.")).toBeVisible();
});

test("remote catalog decision renders only accepted heroes", async ({ page }) => {
  await mockRemoteCatalog(page);
  await page.goto("/mh-calculator/heroes");
  await expect(page.getByText("Бастет")).toBeVisible();
  await expect(page.getByText("Морана")).toHaveCount(0);
  await expect(page.getByText("Показаны локальные билды.")).toHaveCount(0);
});

test("fallback catalog decision remains visible and diagnosable", async ({ page }) => {
  await page.route("https://e2e.invalid/functions/v1/bootstrap", (route) =>
    fulfillJson(route, incompatibleBootstrapResponse()),
  );
  await page.goto("/mh-calculator/heroes");
  await expect(page.getByText("Показаны локальные билды.")).toBeVisible();
  await expect(page.getByText("Бастет")).toBeVisible();
});

test("public build view renders the accepted build", async ({ page }) => {
  await mockRemoteCatalog(page);
  await page.goto("/mh-calculator/heroes/bastet");
  await expect(page.getByText("Бастет", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Axe of Pangu")).toBeVisible();
});

test("non-admin credentials cannot reveal builder controls", async ({ page }) => {
  await mockAuth(page, "user");
  await page.goto("/mh-calculator/admin/branch-builder");
  await signIn(page, "user");
  await expect(page.getByText(/Недостаточно прав администратора/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Опубликовать" })).toHaveCount(0);
});

test("dirty published edit asks before leaving and can stay", async ({ page }) => {
  await mockAuth(page, "admin");
  await page.route("https://e2e.invalid/rest/v1/hero_build_sets**", (route) => {
    const url = new URL(route.request().url());
    const select = url.searchParams.get("select") ?? "";
    if (select === "hero_id,status") {
      return fulfillJson(route, [{ hero_id: "bastet", status: "published" }]);
    }
    return fulfillJson(route, [
      {
        payload: bastetBuildSet,
        revision: 1,
        status: "published",
        updated_at: "2026-08-13T00:00:00.000Z",
        updated_by: "admin-user-id",
      },
    ]);
  });
  await page.goto("/mh-calculator/admin/branch-builder?heroId=bastet&mode=edit");
  await signIn(page, "admin");
  await expect(page.getByText("Axe of Pangu")).toBeVisible();
  await page.getByRole("button", { name: "Remove Axe of Pangu" }).click();
  await expect(page.getByRole("button", { name: "Обновить" })).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Есть несохранённые изменения");
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Назад" }).click();
  await expect(page.getByText("Builder")).toBeVisible();
});
