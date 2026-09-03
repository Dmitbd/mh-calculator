import type { HeroBuildSet } from "@/features/builds";

export function hasCreatePublicationConflict(
  publishedBuildSet: HeroBuildSet | null,
): boolean {
  return publishedBuildSet !== null;
}
