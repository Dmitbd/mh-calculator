import type {
  WeaponAwakeningColor,
  WeaponAwakeningColorId,
  WeaponAwakeningSlot,
  WeaponAwakeningSlotSelection,
} from "../types/admin.types";

type SlotSelections = Partial<Record<number, WeaponAwakeningColorId>>;

/** Следующий цвет при клике по кружку (циклически по справочнику) */
export function getNextWeaponAwakeningColor(
  currentColorId: WeaponAwakeningColorId | null,
  colors: readonly WeaponAwakeningColor[],
): WeaponAwakeningColorId {
  const ordered = [...colors].sort((first, second) => first.order - second.order);

  if (!ordered.length) {
    throw new Error("Weapon awakening colors catalog is empty.");
  }

  if (!currentColorId) {
    return ordered[0].id;
  }

  const currentIndex = ordered.findIndex((color) => color.id === currentColorId);

  if (currentIndex === -1) {
    return ordered[0].id;
  }

  return ordered[(currentIndex + 1) % ordered.length].id;
}

/** Сборка выбранных слотов для export / validation */
export function buildWeaponAwakeningSlots(
  slots: readonly WeaponAwakeningSlot[],
  selections: SlotSelections,
): WeaponAwakeningSlotSelection[] {
  return slots
    .map((slot) => {
      const colorId = selections[slot.slot];

      if (!colorId) {
        return null;
      }

      return {
        slot: slot.slot,
        colorId,
      };
    })
    .filter((entry): entry is WeaponAwakeningSlotSelection => entry !== null);
}

/** Все слоты заполнены цветом */
export function hasFilledAllWeaponAwakeningSlots(
  slots: readonly WeaponAwakeningSlot[],
  selections: SlotSelections,
): boolean {
  return slots.every((slot) => selections[slot.slot] !== undefined);
}
