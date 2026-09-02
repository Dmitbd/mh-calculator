import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppImage } from "./AppImage";
import {
  BRANCH_TREE_MAJOR_NODE_SIZE,
  BRANCH_TREE_MINOR_NODE_SIZE,
  getBranchTreeTone,
  type BranchTreeTone,
} from "./BranchTreeGrid";

type BranchNodeVisualProps = {
  readonly active: boolean;
  readonly accessibilityLabel: string;
  readonly icon: string | null;
  readonly kind: "minor" | "major";
  readonly onPress?: () => void;
  readonly showPlus?: boolean;
  readonly testID: string;
  readonly tone: BranchTreeTone;
};

export function BranchNodeVisual({
  active,
  accessibilityLabel,
  icon,
  kind,
  onPress,
  showPlus = false,
  testID,
  tone: toneName,
}: BranchNodeVisualProps) {
  const tone = getBranchTreeTone(toneName);
  const size =
    kind === "major"
      ? BRANCH_TREE_MAJOR_NODE_SIZE
      : BRANCH_TREE_MINOR_NODE_SIZE;
  const imageSize = size - 6;

  const nodeStyle = [
    styles.node,
    {
      borderColor: active ? tone.color : tone.inactiveColor,
      height: size,
      width: size,
    },
    active && { boxShadow: `0 0 14px ${tone.shadowColor}` },
  ];
  const content = (
    <>
      <View style={styles.inner} testID={`${testID}-inner`}>
        {icon ? (
          <AppImage
            accessible={false}
            accessibilityLabel=""
            borderRadius={imageSize / 2}
            height={imageSize}
            loadingMode="static"
            resizeMode="contain"
            source={icon}
            testID={`${testID}-icon`}
            width={imageSize}
          />
        ) : showPlus ? (
          <Text style={styles.plus}>+</Text>
        ) : (
          <View style={styles.empty} />
        )}
      </View>
      {!active ? (
        <View
          pointerEvents="none"
          style={styles.inactiveOverlay}
          testID={`${testID}-inactive-overlay`}
        />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
        accessibilityState={{ selected: active }}
        style={nodeStyle}
        testID={testID}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={nodeStyle}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  node: {
    position: "relative",
    zIndex: 5,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 3,
    backgroundColor: "#17120f",
    overflow: "hidden",
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  inactiveOverlay: {
    position: "absolute",
    top: 3,
    right: 3,
    bottom: 3,
    left: 3,
    zIndex: 1,
    borderRadius: 999,
    backgroundColor: "rgba(23, 18, 15, 0.58)",
  },
  empty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3b3732",
  },
  plus: {
    color: "#f7ead0",
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 38,
  },
});
