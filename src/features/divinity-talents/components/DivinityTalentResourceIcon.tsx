import { memo } from "react";

import {
  AppImage,
  type AppImageLoadingMode,
} from "@/shared/ui/AppImage";

export type DivinityTalentResourceMetadata = {
  readonly label: string;
  readonly icon: string;
};

type DivinityTalentResourceIconProps = {
  accessible?: boolean;
  loadingMode?: AppImageLoadingMode;
  resource: DivinityTalentResourceMetadata;
  size?: number;
  testID?: string;
};

export const DivinityTalentResourceIcon = memo(
  function DivinityTalentResourceIcon({
    accessible = true,
    loadingMode = "animated",
    resource,
    size = 32,
    testID,
  }: DivinityTalentResourceIconProps) {
    return (
      <AppImage
        accessible={accessible}
        accessibilityLabel={resource.label}
        borderRadius={Math.max(2, Math.round(size / 4))}
        height={size}
        loadingMode={loadingMode}
        resizeMode="contain"
        source={resource.icon}
        testID={testID}
        width={size}
      />
    );
  },
);
