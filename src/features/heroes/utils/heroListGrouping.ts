import type { Hero, HeroFaction } from "@/features/heroes/types/heroes.types";

/** Id зоны отображения героев */
export type HeroZoneId = "ur" | HeroFaction;

/** Фиксированный порядок зон на экране */
export const HERO_ZONE_ORDER: HeroZoneId[] = [
  "ur",
  "luminarch",
  "shadowarch",
  "guardian",
  "verdian",
];

/** Русские заголовки зон */
export const HERO_ZONE_TITLES: Record<HeroZoneId, string> = {
  ur: "UR герои",
  luminarch: "Герои света",
  shadowarch: "Герои тьмы",
  guardian: "Герои хранителей",
  verdian: "Герои леса",
};

/** Группа героев в одной зоне */
export type HeroZoneGroup = {
  /** Id зоны */
  zoneId: HeroZoneId;
  /** Заголовок зоны */
  title: string;
  /** Отсортированные герои */
  heroes: Hero[];
};

/** Возвращает id зоны для героя или null, если герой не попадает ни в одну */
export function getHeroZoneId(hero: Hero): HeroZoneId | null {
  if (hero.rarity === "ur") {
    return "ur";
  }

  if (hero.rarity !== "ssr") {
    return null;
  }

  for (const zoneId of HERO_ZONE_ORDER) {
    if (zoneId === "ur") {
      continue;
    }

    if (hero.factions.includes(zoneId)) {
      return zoneId;
    }
  }

  return null;
}

/** Сортирует героев по русскому имени с fallback на английское */
export function sortHeroesByRuName(first: Hero, second: Hero): number {
  const firstName = first.name.ru || first.name.en;
  const secondName = second.name.ru || second.name.en;

  return firstName.localeCompare(secondName, "ru");
}

/** Группирует героев по зонам, скрывая пустые */
export function groupHeroesByZone(heroes: Hero[]): HeroZoneGroup[] {
  const buckets = new Map<HeroZoneId, Hero[]>();

  for (const zoneId of HERO_ZONE_ORDER) {
    buckets.set(zoneId, []);
  }

  for (const hero of heroes) {
    const zoneId = getHeroZoneId(hero);

    if (!zoneId) {
      continue;
    }

    buckets.get(zoneId)?.push(hero);
  }

  return HERO_ZONE_ORDER.flatMap((zoneId) => {
    const zoneHeroes = buckets.get(zoneId) ?? [];

    if (zoneHeroes.length === 0) {
      return [];
    }

    return [
      {
        zoneId,
        title: HERO_ZONE_TITLES[zoneId],
        heroes: [...zoneHeroes].sort(sortHeroesByRuName),
      },
    ];
  });
}
