import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { BranchNodeVisual } from "../BranchNodeVisual";

const baseProps = {
  accessibilityLabel: "Test node",
  icon: "/img/divinity/talent-icons/talent-10.png",
  kind: "minor" as const,
  testID: "test-branch-node",
  tone: "purple" as const,
};

test("masks the connector with an opaque node and dims the icon using an overlay", () => {
  render(<BranchNodeVisual {...baseProps} active={false} />);

  expect(
    StyleSheet.flatten(screen.getByTestId("test-branch-node").props.style),
  ).toMatchObject({
    backgroundColor: "#17120f",
    zIndex: 5,
  });
  expect(
    StyleSheet.flatten(
      screen.getByTestId("test-branch-node-inner").props.style,
    ),
  ).not.toHaveProperty("opacity");
  expect(screen.getByTestId("test-branch-node-inactive-overlay")).toBeTruthy();
  expect(screen.getByTestId("test-branch-node").props.accessible).toBe(true);
});

test("does not tint an active node", () => {
  render(<BranchNodeVisual {...baseProps} active />);

  expect(
    screen.queryByTestId("test-branch-node-inactive-overlay"),
  ).toBeNull();
});
