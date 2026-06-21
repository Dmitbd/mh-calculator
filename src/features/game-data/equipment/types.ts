export type Artifact = {
  id: string;
  name: string;
  icon: string;
  description: string;
};

export type Rune = {
  id: string;
  name: string;
  icon: string;
  description: string;
  elementalResonance: string;
};

export type EquipmentVariantSelection = {
  artifactIds: string[];
  runeIds: string[];
};
