import { memo } from "react";

import type { DivinityTalentNode as DivinityTalentNodeValue } from "@/features/game-data/divinity-talents";
import { BranchNodeVisual } from "@/shared/ui/BranchNodeVisual";
import type { BranchTreeTone } from "@/shared/ui/BranchTreeGrid";

type DivinityTalentNodeProps = {
  readonly active: boolean;
  readonly branchLabel: string;
  readonly costLabel: string;
  readonly node: DivinityTalentNodeValue;
  readonly onPress: () => void;
  readonly tone: BranchTreeTone;
};

export const DivinityTalentNode = memo(function DivinityTalentNode({
  active,
  branchLabel,
  costLabel,
  node,
  onPress,
  tone,
}: DivinityTalentNodeProps) {
  const kindLabel = node.kind === "major" ? "большая" : "малая";
  const stateLabel = active ? "выбрана" : "не выбрана";

  return (
    <BranchNodeVisual
      active={active}
      accessibilityLabel={`${branchLabel} ветка, уровень ${node.level}, ${kindLabel} нода, стоимость: ${costLabel}, состояние: ${stateLabel}`}
      icon={node.kind === "minor" ? node.icon : null}
      kind={node.kind}
      onPress={onPress}
      showPlus={node.kind === "major"}
      testID={`divinity-talent-node-${node.branchId}-${node.level}`}
      tone={tone}
    />
  );
});
