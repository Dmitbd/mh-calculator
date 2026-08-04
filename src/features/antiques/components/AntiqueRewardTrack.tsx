import { StyleSheet, Text, View } from "react-native";

import {
  ANTIQUE_MAJOR_THRESHOLDS,
  antiqueResourceCatalog,
  antiqueRivalryRewards,
} from "@/features/game-data/antiques";

import { AntiqueResourceIcon } from "./AntiqueResourceIcon";

type AntiqueRewardTrackProps = {
  openedNodes: number;
};

export function AntiqueRewardTrack({ openedNodes }: AntiqueRewardTrackProps) {
  const nodes = antiqueRivalryRewards.slice(1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Шкала наград</Text>
      <Text style={styles.description}>
        16 узлов · крупный сундук каждые 3 000 очков
      </Text>
      <View style={styles.track}>
        {nodes.map((node, index) => {
          const nodeNumber = index + 1;
          const isOpened = nodeNumber <= openedNodes;
          const isMajor = ANTIQUE_MAJOR_THRESHOLDS.includes(node.score);
          const nodeKind = isMajor ? ", крупный сундук" : "";

          return (
            <View
              key={node.score}
              accessible
              accessibilityLabel={`Узел награды ${nodeNumber}: ${node.score} очков, ${
                isOpened ? "открыт" : "закрыт"
              }${nodeKind}`}
              accessibilityState={{ selected: isOpened }}
              style={[
                styles.node,
                isOpened && styles.openedNode,
                isMajor && styles.majorNode,
              ]}
            >
              {isMajor ? (
                <View style={styles.majorMarker}>
                  <AntiqueResourceIcon
                    resource={antiqueResourceCatalog.eventChest}
                    size={34}
                  />
                </View>
              ) : (
                <View style={[styles.dot, isOpened && styles.openedDot]} />
              )}
              <Text style={[styles.nodeNumber, isOpened && styles.openedText]}>
                {nodeNumber}
              </Text>
              <Text style={[styles.score, isOpened && styles.openedText]}>
                {node.score}
              </Text>
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
  description: {
    color: "#bea17b",
    fontSize: 13,
  },
  track: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  node: {
    minWidth: 64,
    flexGrow: 1,
    flexBasis: "20%",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 82,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#503727",
    backgroundColor: "#34251c",
    padding: 7,
    gap: 3,
  },
  openedNode: {
    borderColor: "#b9853f",
    backgroundColor: "#54301a",
  },
  majorNode: {
    borderWidth: 2,
    borderColor: "#d6a951",
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#6c5543",
  },
  openedDot: {
    backgroundColor: "#f0c36a",
  },
  majorMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  nodeNumber: {
    color: "#a99076",
    fontSize: 11,
    fontWeight: "800",
  },
  score: {
    color: "#bca58a",
    fontSize: 12,
    fontWeight: "700",
  },
  openedText: {
    color: "#fff0c7",
  },
});
