import type { HeroBuildTab, HeroBuildTabPath } from "@/features/heroes/types/heroes.types";
import { getDefaultTabPathFromTabs } from "@/features/heroes/utils/heroBuildTabs";

/** Шаблон дерева вкладок назначения в билдере */
export const buildTargetTabs: HeroBuildTab[] = [
  {
    id: "pvp",
    label: "PvP",
    order: 1,
    kind: "build",
    gameMode: "pvp",
    build: null,
  },
  {
    id: "pve",
    label: "PvE",
    order: 2,
    kind: "group",
    gameMode: "pve",
    build: null,
    children: [
      {
        id: "bosses",
        label: "Боссы",
        order: 1,
        kind: "build",
        build: null,
      },
      {
        id: "campaign",
        label: "Кампания",
        order: 2,
        kind: "build",
        build: null,
      },
    ],
  },
];

/** Начальный путь назначения билда в билдере — первая вкладка массива */
export const defaultBuildTargetTabPath: HeroBuildTabPath =
  getDefaultTabPathFromTabs(buildTargetTabs);
