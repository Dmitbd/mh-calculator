import { Image, StyleSheet, Text, View } from "react-native";

import { antiqueRivalryRewards } from "@/features/game-data/antiques";
import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

const REWARDS_PER_ROW = 4;
const REWARD_ROW_COUNT = 4;
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
          const rowStartScore = row[0].score;
          const openedInRow = clamp(
            openedNodes - rowIndex * REWARDS_PER_ROW,
            0,
            REWARDS_PER_ROW,
          );
          const completedLinks = Math.max(openedInRow - 1, 0);
          const rowProgress = completedLinks / (REWARDS_PER_ROW - 1);
          const isRowAvailable =
            rowIndex === 0 || totalScore >= rewardRows[rowIndex - 1][3].score;
          const rowProgressPercent = Math.round(rowProgress * 100);

          return (
            <View key={rowStartScore} style={styles.row}>
              <View
                accessible
                accessibilityLabel={`Линия наград ${rowIndex + 1}: ${
                  isRowAvailable ? "доступна" : "заблокирована"
                }`}
                accessibilityState={{ disabled: !isRowAvailable }}
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: rowProgressPercent,
                }}
                style={styles.rowAccessibilityMarker}
              />
              <View style={styles.rowVisual}>
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
                            styles.chestArtwork,
                            isLargeChest && styles.largeChestArtwork,
                          ]}
                        >
                          <Image
                            accessible={false}
                            resizeMode="contain"
                            source={{ uri: RIVALRY_CHEST_URI }}
                            style={styles.chestImage}
                          />
                          {isOpened ? (
                            <View
                              accessible
                              accessibilityLabel="Открыто"
                              style={styles.openedCheck}
                            >
                              <Text style={styles.openedCheckText}>✓</Text>
                            </View>
                          ) : null}
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
    shadowColor: "#ffd75e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 4,
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
  chestArtwork: {
    width: 52,
    height: 52,
    position: "relative",
  },
  largeChestArtwork: {
    width: 64,
    height: 64,
    marginTop: -5,
    marginBottom: -5,
  },
  chestImage: {
    width: "100%",
    height: "100%",
  },
  openedCheck: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 20,
    height: 20,
    marginTop: -10,
    marginLeft: -10,
    alignItems: "center",
    justifyContent: "center",
  },
  openedCheckText: {
    color: "#42d15b",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 20,
    textShadowColor: "#123818",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
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
