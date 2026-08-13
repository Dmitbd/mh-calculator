import { type LayoutChangeEvent, View } from "react-native";

import { DownloadJsonButton } from "../DownloadJsonButton";
import type { BranchBuildValidationError } from "../../types/admin.types";

type DownloadSectionProps = {
  backendStatus?: string | null;
  errors: readonly BranchBuildValidationError[];
  isDirty?: boolean;
  isPublishPending?: boolean;
  isTabSavePending?: boolean;
  onErrorsLayout: (event: LayoutChangeEvent) => void;
  onDownloadFull: () => void;
  onLoadFull: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onPublishFull: () => void;
  onSaveCurrent: () => void;
  onSaveDraft: () => void;
  mode?: "create" | "edit";
};

export function DownloadSection({
  backendStatus,
  errors,
  isDirty = false,
  isPublishPending = false,
  isTabSavePending = false,
  onErrorsLayout,
  onDownloadFull,
  onLoadFull,
  onLayout,
  onPublishFull,
  onSaveCurrent,
  onSaveDraft,
  mode = "create",
}: DownloadSectionProps) {
  return (
    <View onLayout={onLayout}>
      <DownloadJsonButton
        backendStatus={backendStatus}
        errors={errors}
        isDirty={isDirty}
        isPublishPending={isPublishPending}
        isTabSavePending={isTabSavePending}
        onErrorsLayout={onErrorsLayout}
        onDownloadFull={onDownloadFull}
        onLoadFull={onLoadFull}
        onPublishFull={onPublishFull}
        onSaveCurrent={onSaveCurrent}
        onSaveDraft={onSaveDraft}
        mode={mode}
      />
    </View>
  );
}
