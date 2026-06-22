import { type LayoutChangeEvent, View } from "react-native";

import { DownloadJsonButton } from "../DownloadJsonButton";
import type { BranchBuildValidationError } from "../../types/admin.types";

type DownloadSectionProps = {
  errors: readonly BranchBuildValidationError[];
  onErrorsLayout: (event: LayoutChangeEvent) => void;
  onDownloadFull: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onSaveCurrent: () => void;
};

export function DownloadSection({
  errors,
  onErrorsLayout,
  onDownloadFull,
  onLayout,
  onSaveCurrent,
}: DownloadSectionProps) {
  return (
    <View onLayout={onLayout}>
      <DownloadJsonButton
        errors={errors}
        onErrorsLayout={onErrorsLayout}
        onDownloadFull={onDownloadFull}
        onSaveCurrent={onSaveCurrent}
      />
    </View>
  );
}
