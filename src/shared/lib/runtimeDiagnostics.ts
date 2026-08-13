export type RuntimeDiagnostic = {
  area: "admin-auth" | "data-bootstrap" | "hero-builds" | "runtime-boundary";
  event:
    | "access-denied"
    | "fallback-selected"
    | "recovery-view";
  heroId?: string;
  reason?:
    | "http"
    | "incompatible-schema"
    | "invalid-body"
    | "network"
    | "no-data"
    | "not-configured"
    | "timeout";
  resource?: "heroBuilds";
  route?: string;
};

const MAX_DIAGNOSTIC_VALUE_LENGTH = 64;

function boundValue(value: string): string {
  return value.slice(0, MAX_DIAGNOSTIC_VALUE_LENGTH);
}

export function reportRuntimeDiagnostic(diagnostic: RuntimeDiagnostic): void {
  const safeDiagnostic: RuntimeDiagnostic = {
    area: diagnostic.area,
    event: diagnostic.event,
  };
  if (diagnostic.heroId) safeDiagnostic.heroId = boundValue(diagnostic.heroId);
  if (diagnostic.reason) safeDiagnostic.reason = diagnostic.reason;
  if (diagnostic.resource) safeDiagnostic.resource = diagnostic.resource;
  if (diagnostic.route) safeDiagnostic.route = boundValue(diagnostic.route);

  console.info("MH_DIAGNOSTIC", safeDiagnostic);
}
