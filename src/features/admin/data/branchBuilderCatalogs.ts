import { heroes } from "@/features/game-data/heroes";
import {
  divinityBranches,
  divinitySkills,
  divinityTreeTemplate,
} from "@/features/game-data/divinity";
import {
  equipmentArtifacts,
  equipmentRunes,
} from "@/features/game-data/equipment";
import {
  weaponAwakeningColors,
  weaponAwakeningCombos,
  weaponAwakeningSlots,
} from "@/features/game-data/weapon-awakening";

import type { BranchColumn } from "../types/admin.types";

export const branchBuilderColumns: BranchColumn[] = [
  { id: "left", label: "левая", isMain: false },
  { id: "center", label: "центр", isMain: true },
  { id: "right", label: "правая", isMain: false },
];

export const branchBuilderBranches = divinityBranches;
export const branchBuilderSkills = divinitySkills;
export const branchBuilderTemplate = divinityTreeTemplate;
export const branchBuilderWeaponAwakeningColors = weaponAwakeningColors;
export const branchBuilderWeaponAwakeningCombos = weaponAwakeningCombos;
export const branchBuilderWeaponAwakeningSlots = weaponAwakeningSlots;
export const branchBuilderArtifacts = equipmentArtifacts;
export const branchBuilderRunes = equipmentRunes;
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
