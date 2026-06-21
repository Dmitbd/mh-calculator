import artifactsData from "@/features/game-data/equipment/artifacts.json";
import runesData from "@/features/game-data/equipment/runes.json";
import branchesData from "@/features/game-data/divinity/divinity-branches.json";
import skillsData from "@/features/game-data/divinity/divinity-skills.json";
import templateData from "@/features/game-data/divinity/tree-template.json";
import { heroes } from "@/features/game-data/heroes/heroBuilds";
import weaponAwakeningColorsData from "@/features/game-data/weapon-awakening/weapon-awakening-colors.json";
import weaponAwakeningCombosData from "@/features/game-data/weapon-awakening/weapon-awakening-combos.json";
import weaponAwakeningSlotsData from "@/features/game-data/weapon-awakening/weapon-awakening-slots.json";
import type { WeaponAwakeningCombosData } from "@/features/game-data/weapon-awakening/types";

import type {
  Artifact,
  BranchColumn,
  DivinityBranch,
  DivinityMajorSkill,
  Rune,
  TreeTemplateNode,
  WeaponAwakeningColor,
  WeaponAwakeningSlot,
} from "../types/admin.types";

export const branchBuilderColumns: BranchColumn[] = [
  { id: "left", label: "левая", isMain: false },
  { id: "center", label: "центр", isMain: true },
  { id: "right", label: "правая", isMain: false },
];

export const branchBuilderBranches = [...(branchesData as DivinityBranch[])].sort(
  (first, second) => first.order - second.order,
);
export const branchBuilderSkills = skillsData as DivinityMajorSkill[];
export const branchBuilderTemplate = templateData as TreeTemplateNode[];
export const branchBuilderWeaponAwakeningColors =
  weaponAwakeningColorsData as WeaponAwakeningColor[];
export const branchBuilderWeaponAwakeningCombos =
  weaponAwakeningCombosData as WeaponAwakeningCombosData;
export const branchBuilderWeaponAwakeningSlots =
  weaponAwakeningSlotsData as WeaponAwakeningSlot[];
export const branchBuilderArtifacts = artifactsData as Artifact[];
export const branchBuilderRunes = runesData as Rune[];
export const branchBuilderHeroes = heroes;

export const branchBuilderWeaponAwakeningCatalog = {
  colors: branchBuilderWeaponAwakeningColors,
  slots: branchBuilderWeaponAwakeningSlots,
};

export const branchBuilderValidationCatalog = {
  heroes: branchBuilderHeroes,
  branches: branchBuilderBranches,
  skills: branchBuilderSkills,
  template: branchBuilderTemplate,
  weaponAwakeningColors: branchBuilderWeaponAwakeningColors,
  weaponAwakeningSlots: branchBuilderWeaponAwakeningSlots,
  artifacts: branchBuilderArtifacts,
  runes: branchBuilderRunes,
};
