import { type LayoutChangeEvent, View } from "react-native";

import { DownloadJsonButton } from "../DownloadJsonButton";
import type { BranchBuildValidationError } from "../../types/admin.types";

type DownloadSectionProps = {
  errors: readonly BranchBuildValidationError[];
  onErrorsLayout: (event: LayoutChangeEvent) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onPress: () => void;
};

export function DownloadSection({
  errors,
  onErrorsLayout,
  onLayout,
  onPress,
}: DownloadSectionProps) {
  return (
    <View onLayout={onLayout}>
      <DownloadJsonButton
        errors={errors}
        onErrorsLayout={onErrorsLayout}
        onPress={onPress}
      />
    </View>
  );
}
