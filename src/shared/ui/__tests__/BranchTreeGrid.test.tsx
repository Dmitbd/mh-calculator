import { render, screen, within } from "@testing-library/react-native";
import { Platform, StyleSheet, Text } from "react-native";

import { BranchTreeGrid } from "../BranchTreeGrid";

type ColumnId = "left" | "center" | "right";
type Node = {
  columnId: ColumnId;
  level: number;
  kind: "minor" | "major";
};

const columns = [
  { id: "left", label: "Левая", isMain: false, tone: "blue" },
  { id: "center", label: "Центральная", isMain: true, tone: "green" },
  { id: "right", label: "Правая", isMain: false, tone: "purple" },
] as const;

test("renders sparse nodes and stops the final active line at its caption", () => {
  render(
    <BranchTreeGrid
      columns={columns}
      isBranchPoint={(node) => node.kind === "major"}
      isLevelActive={(columnId, level) =>
        columnId === "center" && level <= 2
      }
      levelHeading="lv."
      levels={[1, 2, 3]}
      nodes={[
        { columnId: "center", level: 1, kind: "major" },
        { columnId: "center", level: 2, kind: "minor" },
        { columnId: "center", level: 3, kind: "minor" },
        { columnId: "left", level: 3, kind: "major" },
        { columnId: "right", level: 3, kind: "major" },
      ]}
      renderNode={(node) => (
        <Text>{`${node.columnId}-${node.level}`}</Text>
      )}
    />,
  );

  expect(screen.getByText("center-1")).toBeTruthy();
  expect(screen.getByText("center-2")).toBeTruthy();
  expect(screen.getByText("left-3")).toBeTruthy();
  expect(screen.getByText("right-3")).toBeTruthy();
  expect(screen.getByText("1")).toBeTruthy();
  expect(screen.getByText("2")).toBeTruthy();
  expect(screen.getByText("3")).toBeTruthy();
  expect(screen.getByText("lv.")).toBeTruthy();

  expect(screen.queryByTestId("branch-tree-upper-center-1")).toBeNull();
  expect(
    StyleSheet.flatten(
      screen.getByTestId("branch-tree-lower-center-2").props.style,
    ),
  ).toMatchObject({
    backgroundColor: "#3b7e28",
    boxShadow: "0 0 4px rgba(98, 239, 69, 0.32)",
  });
  expect(
    StyleSheet.flatten(
      screen.getByTestId("branch-tree-upper-center-3").props.style,
    ),
  ).toMatchObject({
    backgroundColor: "#3b7e28",
    boxShadow: "0 0 4px rgba(98, 239, 69, 0.32)",
  });
  expect(
    StyleSheet.flatten(
      screen.getByTestId("branch-tree-active-tail-center-2").props.style,
    ),
  ).toMatchObject({
    backgroundColor: "#62ef45",
    bottom: 0,
    boxShadow: "0 0 8px rgba(98, 239, 69, 0.9)",
    top: 35,
  });

  expect(
    StyleSheet.flatten(
      screen.getByTestId("branch-tree-lower-center-1").props.style,
    ),
  ).toMatchObject({
    backgroundColor: "#62ef45",
    boxShadow: "0 0 8px rgba(98, 239, 69, 0.9)",
  });
  expect(
    StyleSheet.flatten(
      screen.getByTestId("branch-tree-upper-center-2").props.style,
    ),
  ).toMatchObject({
    backgroundColor: "#62ef45",
    boxShadow: "0 0 8px rgba(98, 239, 69, 0.9)",
  });
});

test("draws the final active tail through the last node caption", () => {
  render(
    <BranchTreeGrid
      columns={columns}
      isBranchPoint={() => false}
      isLevelActive={(columnId, level) =>
        columnId === "center" && level === 30
      }
      levels={[30]}
      nodes={[{ columnId: "center", level: 30, kind: "minor" }]}
      renderNode={(node) => <Text>{`${node.columnId}-${node.level}`}</Text>}
      renderNodeCaption={() => <Text>last-caption</Text>}
    />,
  );

  expect(
    StyleSheet.flatten(
      screen.getByTestId("branch-tree-active-tail-center-30").props.style,
    ),
  ).toMatchObject({
    backgroundColor: "#62ef45",
    bottom: 0,
    top: 35,
  });
  expect(
    within(
      screen.getByTestId("branch-tree-node-content-center-30"),
    ).getByTestId("branch-tree-active-tail-center-30"),
  ).toBeTruthy();
});

test("draws one horizontal track behind all branch-point nodes", () => {
  render(
    <BranchTreeGrid
      columns={columns}
      branchPointConnector={{
        description: "Предел узлов божественной энергии +1",
        icon: "/img/divinity/talent-icons/talent-12.png",
        label: "Узлы божественной энергии",
        meta: "Лимит +1",
      }}
      isBranchPoint={(node) => node.kind === "major"}
      isLevelActive={(columnId, level) =>
        level === 2 && columnId !== "right"
      }
      levels={[1, 2]}
      nodes={[
        { columnId: "center", level: 1, kind: "minor" },
        { columnId: "left", level: 2, kind: "minor" },
        { columnId: "center", level: 2, kind: "major" },
        { columnId: "right", level: 2, kind: "minor" },
      ]}
      renderNode={(node) => (
        <Text>{`${node.columnId}-${node.level}`}</Text>
      )}
    />,
  );

  expect(screen.queryByTestId("branch-tree-horizontal-track-1")).toBeNull();
  expect(screen.getByTestId("branch-tree-horizontal-track-2")).toBeTruthy();
  expect(screen.getByTestId("branch-tree-ornament-center-left-2")).toBeTruthy();
  expect(screen.getByTestId("branch-tree-ornament-center-right-2")).toBeTruthy();
  expect(screen.queryByText("Лимит +1")).toBeNull();
  expect(screen.queryByText("Узлы божественной энергии")).toBeNull();
  expect(
    screen.getAllByLabelText(
      "Узлы божественной энергии. Предел узлов божественной энергии +1",
    ),
  ).toHaveLength(2);
  expect(
    StyleSheet.flatten(
      screen.getByTestId("branch-tree-horizontal-left-2").props.style,
    ),
  ).toMatchObject({
    backgroundColor: "#2798ff",
    boxShadow: "0 0 8px rgba(39, 152, 255, 0.9)",
    flex: 1,
  });
  expect(
    StyleSheet.flatten(
      screen.getByTestId("branch-tree-horizontal-right-2").props.style,
    ),
  ).toMatchObject({
    backgroundColor: "#5d2585",
    boxShadow: "0 0 4px rgba(166, 61, 255, 0.32)",
    flex: 1,
  });
  expect(screen.queryByTestId("branch-tree-horizontal-center-left-2")).toBeNull();
  expect(screen.queryByTestId("branch-tree-horizontal-center-right-2")).toBeNull();
  expect(screen.queryByTestId("branch-tree-horizontal-left-right-2")).toBeNull();
  expect(screen.queryByTestId("branch-tree-horizontal-right-left-2")).toBeNull();

  const horizontalStyle = StyleSheet.flatten(
    screen.getByTestId("branch-tree-horizontal-track-2").props.style,
  );
  const ornamentStyle = StyleSheet.flatten(
    screen.getByTestId("branch-tree-ornament-center-right-2").props.style,
  );
  const nodeContentStyle = StyleSheet.flatten(
    screen.getByTestId("branch-tree-node-content-center-2").props.style,
  );
  expect(horizontalStyle.zIndex).toBeLessThan(ornamentStyle.zIndex);
  expect(ornamentStyle.zIndex).toBeLessThan(nodeContentStyle.zIndex);
});

test("keeps captions below a fixed node stage without moving connector intersections", () => {
  render(
    <BranchTreeGrid
      columns={columns}
      isBranchPoint={(node) => node.kind === "major"}
      isLevelActive={() => false}
      levels={[1, 2]}
      nodes={[
        { columnId: "center", level: 1, kind: "major" },
        { columnId: "center", level: 2, kind: "minor" },
      ]}
      renderNode={(node) => <Text>{`${node.columnId}-${node.level}`}</Text>}
      renderNodeCaption={(node) => <Text>{`caption-${node.level}`}</Text>}
    />,
  );

  expect(screen.getByText("caption-1")).toBeTruthy();
  expect(
    StyleSheet.flatten(
      screen.getByTestId("branch-tree-node-stage-center-1").props.style,
    ),
  ).toMatchObject({ height: 70 });
  expect(
    StyleSheet.flatten(
      screen.getByTestId("branch-tree-lower-center-1").props.style,
    ),
  ).toMatchObject({ top: 35 });
});

test("rejects duplicate nodes before rendering contradictory branch geometry", () => {
  const renderNode = jest.fn((node: Node) => (
    <Text>{`${node.columnId}-${node.level}-${node.kind}`}</Text>
  ));

  expect(() =>
    render(
      <BranchTreeGrid
        columns={columns}
        isBranchPoint={(node) => node.kind === "major"}
        isLevelActive={() => false}
        levels={[1]}
        nodes={[
          { columnId: "center", level: 1, kind: "minor" },
          { columnId: "center", level: 1, kind: "major" },
        ]}
        renderNode={renderNode}
      />,
    ),
  ).toThrow(
    'BranchTreeGrid received duplicate node for column "center" at level 1.',
  );
  expect(renderNode).not.toHaveBeenCalled();
});

test("hides decorative connectors on native and web without hiding rendered nodes", () => {
  const originalPlatform = Platform.OS;

  try {
    (["ios", "android", "web"] as const).forEach((platform) => {
      Object.defineProperty(Platform, "OS", { value: platform });

      const view = render(
        <BranchTreeGrid
          columns={columns}
          isBranchPoint={(node) => node.kind === "major"}
          isLevelActive={() => false}
          levels={[1, 2]}
          nodes={[
            { columnId: "center", level: 1, kind: "minor" },
            { columnId: "left", level: 2, kind: "minor" },
            { columnId: "center", level: 2, kind: "major" },
            { columnId: "right", level: 2, kind: "minor" },
          ]}
          renderNode={(node) => (
            <Text>{`${node.columnId}-${node.level}`}</Text>
          )}
        />,
      );

      const verticalConnector = view.getByTestId(
        "branch-tree-lower-center-1",
        { includeHiddenElements: true },
      );
      const horizontalConnector = view.getByTestId(
        "branch-tree-horizontal-track-2",
        { includeHiddenElements: true },
      );

      [verticalConnector, horizontalConnector].forEach((connector) => {
        expect(connector.props.accessible).toBe(false);
        expect(connector.props.accessibilityElementsHidden).toBeUndefined();
        expect(connector.props.importantForAccessibility).toBe(
          platform === "android" ? "no" : undefined,
        );
        expect(connector.props["aria-hidden"]).toBe(
          platform === "web" ? true : undefined,
        );
      });
      expect(verticalConnector.props.accessibilityLabel).toBe(
        "center level 1 lower branch connector",
      );

      const node = view.getByTestId("branch-tree-node-center-1");
      expect(node.props.accessible).toBeUndefined();
      expect(node.props.accessibilityElementsHidden).toBeUndefined();
      expect(node.props.importantForAccessibility).toBeUndefined();
      expect(node.props["aria-hidden"]).toBeUndefined();
      expect(view.getByText("center-1")).toBeTruthy();

      view.unmount();
    });
  } finally {
    Object.defineProperty(Platform, "OS", { value: originalPlatform });
  }
});
