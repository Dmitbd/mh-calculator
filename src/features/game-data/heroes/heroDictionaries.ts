import type { HeroDictionaryEntry } from "@/features/heroes/types/heroes.types";

import elementsData from "./elements.json";
import factionsData from "./factions.json";
import raritiesData from "./rarities.json";
import rolesData from "./roles.json";

/** Словарь редкостей */
export const heroRarities = raritiesData as HeroDictionaryEntry[];

/** Словарь ролей */
export const heroRoles = rolesData as HeroDictionaryEntry[];

/** Словарь фракций */
export const heroFactions = factionsData as HeroDictionaryEntry[];

/** Словарь стихий */
export const heroElements = elementsData as HeroDictionaryEntry[];

/** Найти запись словаря по id */
export function getDictionaryEntry(
  entries: HeroDictionaryEntry[],
  id: string,
): HeroDictionaryEntry | null {
  return entries.find((entry) => entry.id === id) ?? null;
}
