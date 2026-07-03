import { useLocalSearchParams } from "expo-router";

import { DivinityBranchBuilderScreen } from "../../src/features/admin/screens/DivinityBranchBuilderScreen";

export default function BranchBuilderRoute() {
  const params = useLocalSearchParams<{
    heroId?: string | string[];
    mode?: string | string[];
  }>();
  const mode = readParam(params.mode) === "edit" ? "edit" : "create";

  return (
    <DivinityBranchBuilderScreen
      initialHeroId={readParam(params.heroId)}
      initialMode={mode}
    />
  );
}

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
