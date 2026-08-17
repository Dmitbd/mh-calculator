import { StyleSheet, Text, View } from "react-native";

import { summonRivalryRewards } from "@/features/game-data/summon-rivalry";
import { AppImage } from "@/shared/ui/AppImage";

const REWARDS_PER_ROW = 4;
const REWARD_ROW_COUNT = 4;
const RIVALRY_CHEST_SOURCE = "/img/summon-rivalry/rivalry-chest.png";

type SummonRewardTrackProps = {
  openedNodes: number;
  totalScore: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function SummonRewardTrack({
  openedNodes,
  totalScore,
}: SummonRewardTrackProps) {
  const rewardRows = Array.from({ length: REWARD_ROW_COUNT }, (_, rowIndex) =>
    summonRivalryRewards.slice(
      rowIndex * REWARDS_PER_ROW,
      (rowIndex + 1) * REWARDS_PER_ROW,
    ),
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Шкала наград</Text>
      <View style={styles.track}>
        {rewardRows.map((row, rowIndex) => {
          const openedInRow = clamp(
            openedNodes - rowIndex * REWARDS_PER_ROW,
            0,
            REWARDS_PER_ROW,
          );
          const completedLinks = Math.max(openedInRow - 1, 0);
          const rowProgress = completedLinks / (REWARDS_PER_ROW - 1);
          const isRowAvailable =
            rowIndex === 0 || totalScore >= rewardRows[rowIndex - 1][3].score;

          return (
            <View key={row[0].score} style={styles.row}>
              <View
                accessible
                accessibilityLabel={`Линия наград ${rowIndex + 1}: ${
                  isRowAvailable ? "доступна" : "заблокирована"
                }`}
                accessibilityState={{ disabled: !isRowAvailable }}
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: Math.round(rowProgress * 100),
                }}
                style={styles.rowAccessibilityMarker}
              />
              <View style={styles.rowVisual}>
                <View style={styles.line}>
                  <View
                    style={[
                      styles.lineProgress,
                      { width: `${rowProgress * 100}%` as `${number}%` },
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
                          <AppImage
                            accessible={false}
                            accessibilityLabel="Сундук награды"
                            height="100%"
                            resizeMode="contain"
                            source={RIVALRY_CHEST_SOURCE}
                            testID={`summon-rivalry-reward-chest-${nodeNumber}`}
                            width="100%"
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
  title: { color: "#fff3d1", fontSize: 22, fontWeight: "800" },
  track: { gap: 16 },
  row: { position: "relative" },
  rowAccessibilityMarker: {
    position: "absolute",
    width: 1,
    height: 1,
    overflow: "hidden",
  },
  rowVisual: { minHeight: 88, justifyContent: "center" },
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
  chestNode: { flex: 1, minWidth: 0, alignItems: "center", gap: 4 },
  chestArtwork: { width: 52, height: 52, position: "relative" },
  largeChestArtwork: {
    width: 64,
    height: 64,
    marginTop: -5,
    marginBottom: -5,
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
  },
  score: { color: "#9f9288", fontSize: 12, fontWeight: "700" },
  openedScore: { color: "#fff0c7" },
});
