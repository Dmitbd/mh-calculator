import { StyleSheet, Text } from "react-native";

import type { AntiqueRivalryResult } from "../model/types";

type AntiqueSummaryProps = {
  result: AntiqueRivalryResult;
};

export function AntiqueSummary({ result }: AntiqueSummaryProps) {
  void result;

  return (
    <Text style={styles.title}>Калькулятор соперничества за антиквариат</Text>
  );
}

const styles = StyleSheet.create({
  title: {
    color: "#fff3d1",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
});
