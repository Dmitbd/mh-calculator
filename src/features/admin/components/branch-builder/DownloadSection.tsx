import { type LayoutChangeEvent, View } from "react-native";

import { DownloadJsonButton } from "../DownloadJsonButton";
import type { BranchBuildValidationError } from "../../types/admin.types";

type DownloadSectionProps = {
  backendStatus?: string | null;
  errors: readonly BranchBuildValidationError[];
  isPublishPending?: boolean;
  onErrorsLayout: (event: LayoutChangeEvent) => void;
  onDeleteFull: () => void;
  onDownloadFull: () => void;
  onLoadFull: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onPublishFull: () => void;
  onSaveCurrent: () => void;
  onSaveDraft: () => void;
};

export function DownloadSection({
  backendStatus,
  errors,
  isPublishPending = false,
  onErrorsLayout,
  onDeleteFull,
  onDownloadFull,
  onLoadFull,
  onLayout,
  onPublishFull,
  onSaveCurrent,
  onSaveDraft,
}: DownloadSectionProps) {
  return (
    <View onLayout={onLayout}>
      <DownloadJsonButton
        backendStatus={backendStatus}
        errors={errors}
        isPublishPending={isPublishPending}
        onErrorsLayout={onErrorsLayout}
        onDeleteFull={onDeleteFull}
        onDownloadFull={onDownloadFull}
        onLoadFull={onLoadFull}
        onPublishFull={onPublishFull}
        onSaveCurrent={onSaveCurrent}
        onSaveDraft={onSaveDraft}
      />
    </View>
  );
}
