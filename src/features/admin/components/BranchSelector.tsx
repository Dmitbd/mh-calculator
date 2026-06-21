import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  DivinityBranch,
  DivinityBranchId,
} from "../types/admin.types";
import { IconPreview } from "@/shared/ui/IconPreview";

type BranchSelectorProps = {
  label: string;
  branches: readonly DivinityBranch[];
  selectedBranchId: DivinityBranchId | null;
  onSelect: (branchId: DivinityBranchId) => void;
};

export function BranchSelector({
  label,
  branches,
  selectedBranchId,
  onSelect,
}: BranchSelectorProps) {
  const selectedBranch =
    branches.find((branch) => branch.id === selectedBranchId) ?? null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <IconPreview
          label={selectedBranch?.title ?? label}
          source={selectedBranch?.icon ?? null}
          size={28}
        />
      </View>
      <View style={styles.options}>
        {branches.map((branch) => {
          const selected = branch.id === selectedBranchId;

          return (
            <Pressable
              accessibilityLabel={`Select ${branch.title} for ${label}`}
              accessibilityRole="button"
              key={branch.id}
              onPress={() => onSelect(branch.id)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <IconPreview label={branch.title} source={branch.icon} size={24} />
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {branch.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: 220,
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#60462f",
    backgroundColor: "#241610",
    padding: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    color: "#fff1cf",
    fontSize: 15,
    fontWeight: "800",
  },
  options: {
    gap: 8,
  },
  option: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#4b3424",
    backgroundColor: "#1c110d",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  optionSelected: {
    borderColor: "#f0c36a",
    backgroundColor: "#3a2415",
  },
  optionText: {
    flex: 1,
    color: "#d8c4a8",
    fontSize: 13,
    fontWeight: "700",
  },
  optionTextSelected: {
    color: "#fff6df",
  },
});
