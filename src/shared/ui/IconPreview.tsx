import { AppImage } from "@/shared/ui/AppImage";

type IconPreviewProps = {
  source: string | null;
  label: string;
  size?: number;
};

export function IconPreview({ source, label, size = 34 }: IconPreviewProps) {
  return (
    <AppImage
      accessibilityLabel={source ? `${label} icon` : `${label} icon placeholder`}
      borderRadius={size / 2}
      height={size}
      source={source}
      width={size}
    />
  );
}
