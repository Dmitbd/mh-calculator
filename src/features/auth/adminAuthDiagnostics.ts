import { reportRuntimeDiagnostic } from "@/shared/lib/runtimeDiagnostics";

export function reportAdminAuthAccessDenied(): void {
  reportRuntimeDiagnostic("admin-auth", "access-denied");
}
