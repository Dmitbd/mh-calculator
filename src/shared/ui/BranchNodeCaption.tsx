import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  getBranchTreeTone,
  type BranchTreeTone,
} from "./BranchTreeGrid";

type BranchNodeCaptionProps = {
  readonly active: boolean;
  readonly children?: ReactNode;
  readonly meta?: string | null;
  readonly testID?: string;
  readonly title: string;
  readonly tone: BranchTreeTone;
};

export function BranchNodeCaption({
  active,
  children,
  meta,
  testID,
  title,
  tone: toneName,
}: BranchNodeCaptionProps) {
  const tone = getBranchTreeTone(toneName);

  return (
    <View
      style={[
        styles.caption,
        { borderColor: active ? tone.color : tone.inactiveLineColor },
      ]}
      testID={testID}
    >
      <Text numberOfLines={2} style={styles.title}>
        {title}
      </Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    width: "100%",
    maxWidth: 88,
    minWidth: 0,
    alignSelf: "center",
    alignItems: "center",
    gap: 2,
    borderRadius: 7,
    borderWidth: 1,
    backgroundColor: "#1a110d",
    paddingHorizontal: 4,
    paddingVertical: 5,
  },
  title: {
    width: "100%",
    color: "#f9e3bd",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 12,
    textAlign: "center",
  },
  meta: {
    color: "#ffd36b",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 13,
    textAlign: "center",
  },
  children: {
    width: "100%",
    alignItems: "center",
    paddingTop: 1,
  },
});
