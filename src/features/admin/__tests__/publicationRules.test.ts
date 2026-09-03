import type { HeroBuildSet } from "@/features/builds";

import { hasCreatePublicationConflict } from "../model/publicationRules";

const publishedBuildSet: HeroBuildSet = { schemaVersion: 2, tabs: [] };

it("allows create publication when no published build exists", () => {
  expect(hasCreatePublicationConflict(null)).toBe(false);
});

it("reports a create publication conflict for an existing published build", () => {
  expect(hasCreatePublicationConflict(publishedBuildSet)).toBe(true);
});
