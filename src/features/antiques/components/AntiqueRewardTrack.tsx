import { Image, StyleSheet, Text, View } from "react-native";

import { antiqueRivalryRewards } from "@/features/game-data/antiques";
import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

const REWARDS_PER_ROW = 4;
const REWARD_ROW_COUNT = 4;
const SCORE_PER_ROW = 3_000;
const RIVALRY_CHEST_URI = resolveAssetUri(
  "/img/antiques/rivalry-chest.png",
);

type AntiqueRewardTrackProps = {
  openedNodes: number;
  totalScore: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function AntiqueRewardTrack({
  openedNodes,
  totalScore,
}: AntiqueRewardTrackProps) {
  const nodes = antiqueRivalryRewards.slice(1);
  const rewardRows = Array.from({ length: REWARD_ROW_COUNT }, (_, rowIndex) =>
    nodes.slice(
      rowIndex * REWARDS_PER_ROW,
      (rowIndex + 1) * REWARDS_PER_ROW,
    ),
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Шкала наград</Text>
      <View style={styles.track}>
        {rewardRows.map((row, rowIndex) => {
          const rowStartScore = rowIndex * SCORE_PER_ROW;
          const rowEndScore = rowStartScore + SCORE_PER_ROW;
          const rowProgress = clamp(
            (totalScore - rowStartScore) / (rowEndScore - rowStartScore),
            0,
            1,
          );
          const isRowAvailable = totalScore >= rowStartScore;

          return (
            <View key={rowStartScore} style={styles.row}>
              <View
                accessible
                accessibilityLabel={`Линия наград ${rowIndex + 1}: ${
                  isRowAvailable ? "доступна" : "заблокирована"
                }`}
                accessibilityState={{ disabled: !isRowAvailable }}
                style={styles.rowAccessibilityMarker}
              />
              <View
                style={[
                  styles.rowVisual,
                  !isRowAvailable && styles.unavailableRow,
                ]}
              >
                <View style={styles.line}>
                  <View
                    style={[
                      styles.lineProgress,
                      {
                        width: `${rowProgress * 100}%` as `${number}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.chestRow}>
                  {row.map((node, indexInRow) => {
                    const nodeNumber =
                      rowIndex * REWARDS_PER_ROW + indexInRow + 1;
                    const isOpened = nodeNumber <= openedNodes;
                    const isLargeChest = indexInRow === REWARDS_PER_ROW - 1;

                    return (
                      <View
                        key={node.score}
                        accessible
                        accessibilityLabel={`Сундук награды ${nodeNumber}: ${
                          node.score
                        } очков, ${isOpened ? "открыт" : "закрыт"}${
                          isLargeChest ? ", большой сундук" : ""
                        }`}
                        accessibilityState={{ selected: isOpened }}
                        style={styles.chestNode}
                      >
                        <View
                          style={[
                            styles.chestGlow,
                            isOpened && styles.openedChestGlow,
                            isLargeChest && styles.largeChestGlow,
                          ]}
                        >
                          <Image
                            accessible={false}
                            resizeMode="contain"
                            source={{ uri: RIVALRY_CHEST_URI }}
                            tintColor={isOpened ? undefined : "#81766f"}
                            style={[
                              styles.chestImage,
                              !isOpened && styles.closedChestImage,
                              isLargeChest && styles.largeChestImage,
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            styles.score,
                            isOpened && styles.openedScore,
                          ]}
                        >
                          {node.score}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    padding: 20,
    gap: 10,
  },
  title: {
    color: "#fff3d1",
    fontSize: 22,
    fontWeight: "800",
  },
  track: {
    gap: 16,
  },
  row: {
    position: "relative",
  },
  rowAccessibilityMarker: {
    position: "absolute",
    width: 1,
    height: 1,
    overflow: "hidden",
  },
  rowVisual: {
    minHeight: 88,
    justifyContent: "center",
  },
  unavailableRow: {
    opacity: 0.55,
  },
  line: {
    position: "absolute",
    top: 31,
    left: "10%",
    right: "10%",
    height: 5,
    overflow: "hidden",
    borderRadius: 3,
    backgroundColor: "#554b45",
  },
  lineProgress: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#d7a843",
  },
  chestRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  chestNode: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 4,
  },
  chestGlow: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 29,
  },
  openedChestGlow: {
    backgroundColor: "rgba(243, 190, 70, 0.2)",
    shadowColor: "#ffd76f",
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 7,
  },
  largeChestGlow: {
    width: 68,
    height: 68,
    marginTop: -5,
    marginBottom: -5,
    borderRadius: 34,
  },
  chestImage: {
    width: 52,
    height: 52,
  },
  closedChestImage: {
    opacity: 0.55,
  },
  largeChestImage: {
    width: 64,
    height: 64,
  },
  score: {
    color: "#9f9288",
    fontSize: 12,
    fontWeight: "700",
  },
  openedScore: {
    color: "#fff0c7",
  },
});
