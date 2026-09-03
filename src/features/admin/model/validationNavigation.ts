import type {
  BranchBuildValidationError,
} from "../types/admin.types";

export type ValidationScrollSection =
  | "targetTabs"
  | "hero"
  | "equipment"
  | "weaponAwakening"
  | "divinitySkills"
  | "branchGrid"
  | "actions";

export type PendingValidationScrollTarget = "top" | ValidationScrollSection;

const MAX_VALIDATION_TOAST_ERRORS = 5;

export function getRelativeValidationErrors(
  errors: readonly BranchBuildValidationError[],
  tabPath: readonly string[],
): BranchBuildValidationError[] {
  const tabKey = tabPath.join("/");
  const fieldPrefix = `${tabKey}.`;

  return errors.reduce<BranchBuildValidationError[]>((relativeErrors, error) => {
    if (!error.path) return relativeErrors;
    if (error.path === tabKey) {
      relativeErrors.push({ ...error, path: undefined });
    } else if (error.path.startsWith(fieldPrefix)) {
      relativeErrors.push({ ...error, path: error.path.slice(fieldPrefix.length) });
    }
    return relativeErrors;
  }, []);
}

export function areTabPathsEqual(
  first: readonly string[],
  second: readonly string[],
): boolean {
  return first.length === second.length &&
    first.every((segment, index) => segment === second[index]);
}

export function getValidationScrollTarget(
  errors: readonly BranchBuildValidationError[],
): PendingValidationScrollTarget {
  if (hasTargetTabErrors(errors)) return "top";
  const path = errors[0]?.path;
  if (!path) return "top";
  if (path === "heroId" || path === "heroName") return "hero";
  if (path.startsWith("equipment.")) return "equipment";
  if (path.startsWith("weaponAwakening.")) return "weaponAwakening";
  if (path.startsWith("divinitySkills.")) return "divinitySkills";
  if (path.startsWith("columns.") || path.startsWith("progress.") || path.startsWith("majorNodes.")) {
    return "branchGrid";
  }
  return "top";
}

export function formatValidationToastMessage(
  errors: readonly BranchBuildValidationError[],
  fallbackMessage: string,
): string {
  const messages = [...new Set(errors.map((error) => error.message).filter(Boolean))];
  if (messages.length === 0) return fallbackMessage;
  const visibleMessages = messages.slice(0, MAX_VALIDATION_TOAST_ERRORS);
  const hiddenCount = messages.length - visibleMessages.length;
  return [...visibleMessages, ...(hiddenCount > 0 ? [`И ещё ${hiddenCount} ошибок.`] : [])].join("\n");
}

export function isTargetTabErrorPath(path: string): boolean {
  return !path.includes(".") && (path.includes("/") || path === "pvp" || path === "pve");
}

export function hasTargetTabErrors(errors: readonly BranchBuildValidationError[]): boolean {
  return errors.some((error) =>
    error.code.startsWith("multiBuild.") || Boolean(error.path && isTargetTabErrorPath(error.path)),
  );
}

export function getErrorMessages(
  errors: readonly BranchBuildValidationError[],
  matches: (path: string, error: BranchBuildValidationError) => boolean,
): string[] {
  return errors.filter((error) => error.path && matches(error.path, error)).map((error) => error.message);
}
