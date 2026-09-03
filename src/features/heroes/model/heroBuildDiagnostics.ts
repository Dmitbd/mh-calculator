import type { BootstrapFallbackReason } from "@/features/builds";
import { reportRuntimeDiagnostic } from "@/shared/lib/runtimeDiagnostics";

type HeroBuildFallbackDiagnostic = {
  heroId?: string;
  reason: BootstrapFallbackReason | "no-data";
  route?: string;
};

export function reportHeroBuildFallbackSelected({
  heroId,
  reason,
  route,
}: HeroBuildFallbackDiagnostic): void {
  const attributes: Record<string, string> = {};
  if (heroId) attributes.heroId = heroId;
  attributes.reason = reason;
  attributes.resource = "heroBuilds";
  if (route) attributes.route = route;

  reportRuntimeDiagnostic(
    "hero-builds",
    "fallback-selected",
    attributes,
  );
}
