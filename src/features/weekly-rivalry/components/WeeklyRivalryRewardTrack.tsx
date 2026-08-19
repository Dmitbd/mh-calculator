import { StyleSheet, Text, View } from "react-native";

import type { WeeklyRivalryNode } from "@/features/game-data/weekly-rivalry";
import { AppImage } from "@/shared/ui/AppImage";

const REWARDS_PER_ROW = 4;
const RIVALRY_CHEST_SOURCE = "/img/weekly-rivalry/rivalry-chest.png";

type WeeklyRivalryRewardTrackProps = {
  nodes: readonly WeeklyRivalryNode[];
  openedNodes: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function WeeklyRivalryRewardTrack({
  nodes,
  openedNodes,
}: WeeklyRivalryRewardTrackProps) {
  const rows = Array.from(
    { length: Math.ceil(nodes.length / REWARDS_PER_ROW) },
    (_, rowIndex) =>
      nodes.slice(
        rowIndex * REWARDS_PER_ROW,
        (rowIndex + 1) * REWARDS_PER_ROW,
      ),
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Шкала наград</Text>
      <View style={styles.track}>
        {rows.map((row, rowIndex) => {
          const openedInRow = clamp(
            openedNodes - rowIndex * REWARDS_PER_ROW,
            0,
            row.length,
          );
          const completedLinks = Math.max(openedInRow - 1, 0);
          const rowProgress =
            row.length > 1 ? completedLinks / (row.length - 1) : 0;
          const isRowAvailable =
            rowIndex === 0 || openedNodes >= rowIndex * REWARDS_PER_ROW;

          return (
            <View key={row[0].id} style={styles.row}>
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
                    const isLargeChest = node.isSpecial;

                    return (
                      <View
                        key={node.id}
                        accessible
                        accessibilityLabel={`Сундук награды ${nodeNumber}: ${
                          node.requiredScore
                        } очков, ${isOpened ? "открыт" : "закрыт"}${
                          isLargeChest ? ", большой сундук" : ""
                        }`}
                        accessibilityState={{ selected: isOpened }}
                        style={styles.chestNode}
                        testID={`weekly-rivalry-reward-chest-${nodeNumber}`}
                      >
                        <View
                          style={[
                            styles.chestArtwork,
                            isLargeChest && styles.largeChestArtwork,
                          ]}
                        >
                          <AppImage
                            accessible={false}
                            accessibilityLabel="Изображение сундука"
                            height="100%"
                            resizeMode="contain"
                            source={RIVALRY_CHEST_SOURCE}
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
                          {node.requiredScore}
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
    gap: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    padding: 20,
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
    minWidth: 0,
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  chestArtwork: { position: "relative", width: 52, height: 52 },
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
    textShadowColor: "#123818",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  score: { color: "#9f9288", fontSize: 12, fontWeight: "700" },
  openedScore: { color: "#fff0c7" },
});
