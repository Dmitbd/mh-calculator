import heroesData from "@/features/game-data/heroes/heroes.json";
import type { Hero } from "@/features/heroes/types/heroes.types";

import { matchesHeroCatalogSearch, searchHeroCatalog } from "../utils/searchHeroCatalog";

const heroes = heroesData as Hero[];

describe("searchHeroCatalog", () => {
  it("finds heroes by Russian name", () => {
    const result = searchHeroCatalog(heroes, "бас");

    expect(result.some((hero) => hero.id === "bastet")).toBe(true);
  });

  it("finds heroes by English name", () => {
    const result = searchHeroCatalog(heroes, "bast");

    expect(result.some((hero) => hero.id === "bastet")).toBe(true);
  });

  it("finds heroes by id", () => {
    const result = searchHeroCatalog(heroes, "bastet");

    expect(result).toEqual([expect.objectContaining({ id: "bastet" })]);
  });

  it("returns empty list for blank query", () => {
    expect(searchHeroCatalog(heroes, "   ")).toEqual([]);
  });

  it("matches case-insensitively", () => {
    expect(matchesHeroCatalogSearch(heroes.find((hero) => hero.id === "bastet")!, "BAST")).toBe(
      true,
    );
  });
});
