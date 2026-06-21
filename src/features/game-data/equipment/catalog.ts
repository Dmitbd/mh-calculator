import artifactsData from "./artifacts.json";
import runesData from "./runes.json";
import type { Artifact, Rune } from "./types";

export const equipmentArtifacts = artifactsData as Artifact[];
export const equipmentRunes = runesData as Rune[];
