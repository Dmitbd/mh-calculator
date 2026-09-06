jest.mock("@/shared/lib/resolveAssetUri", () => ({
  __esModule: true,
  resolveAssetUri: jest.fn((assetPath: string) => `resolved:${assetPath}`),
}));

jest.mock("@/features/game-data/divinity-talents", () => {
  const actual = jest.requireActual<
    typeof import("@/features/game-data/divinity-talents")
  >("@/features/game-data/divinity-talents");

  return {
    ...actual,
    getDivinityTalentNodeCost: jest.fn(actual.getDivinityTalentNodeCost),
  };
});

import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { Image, StyleSheet } from "react-native";

import {
  divinityTalentConfig,
  getDivinityTalentNodeCost,
} from "@/features/game-data/divinity-talents";
import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

import { DivinityTalentNode } from "../components/DivinityTalentNode";
import { DivinityTalentResourceIcon } from "../components/DivinityTalentResourceIcon";
import { DivinityTalentSummary } from "../components/DivinityTalentSummary";
import { DivinityTalentTree } from "../components/DivinityTalentTree";
import type {
  DivinityTalentRequiredResources,
  DivinityTalentSelections,
} from "../model/types";

const emptySelections: DivinityTalentSelections = {
  left: null,
  center: null,
  right: null,
};

function renderTree(
  selections: DivinityTalentSelections = emptySelections,
  onSelectNode = jest.fn(async () => undefined),
) {
  return {
    onSelectNode,
    view: render(
      <DivinityTalentTree
        config={divinityTalentConfig}
        onSelectNode={onSelectNode}
        selections={selections}
      />,
    ),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("renders the APK topology and dispatches each branch independently", () => {
  const { onSelectNode } = renderTree();
  const buttons = screen.getAllByRole("button");

  expect(buttons).toHaveLength(76);
  expect(
    buttons.filter((button) =>
      button.props.accessibilityLabel.startsWith("Центральная ветка"),
    ),
  ).toHaveLength(28);
  expect(
    buttons.filter((button) =>
      button.props.accessibilityLabel.startsWith("Левая ветка"),
    ),
  ).toHaveLength(24);
  expect(
    buttons.filter((button) =>
      button.props.accessibilityLabel.startsWith("Правая ветка"),
    ),
  ).toHaveLength(24);

  expect(screen.getByTestId("divinity-talent-node-center-1")).toBeTruthy();
  expect(screen.queryByTestId("divinity-talent-node-left-1")).toBeNull();
  expect(screen.queryByTestId("divinity-talent-node-right-1")).toBeNull();
  expect(screen.getByTestId("divinity-talent-node-left-3")).toBeTruthy();
  expect(screen.getByTestId("divinity-talent-node-right-3")).toBeTruthy();
  expect(screen.queryByText("Левая")).toBeNull();
  expect(screen.queryByText("Центральная")).toBeNull();
  expect(screen.queryByText("Правая")).toBeNull();

  buttons.forEach((button) => {
    expect(button.props.accessibilityLabel).toMatch(
      /^(Левая|Центральная|Правая) ветка, уровень \d+, (большая|малая) нода, стоимость: .+, состояние: не выбрана$/,
    );
  });

  fireEvent.press(screen.getByTestId("divinity-talent-node-left-3"));
  fireEvent.press(screen.getByTestId("divinity-talent-node-center-1"));
  fireEvent.press(screen.getByTestId("divinity-talent-node-right-3"));

  expect(onSelectNode.mock.calls).toEqual([
    ["left", 3],
    ["center", 1],
    ["right", 3],
  ]);
});

test("keeps an anonymous major node compact with its branch-resource costs always visible", () => {
  renderTree();
  const node = screen.getByTestId("divinity-talent-node-left-3");

  expect(within(node).getByText("+")).toBeTruthy();
  expect(within(node).queryByText("150")).toBeNull();
  const caption = screen.getByTestId("divinity-talent-node-caption-left-3");
  expect(within(caption).getByText("Большая нода")).toBeTruthy();
  expect(within(caption).getByTestId("divinity-talent-node-caption-left-3-cost-faith")).toBeTruthy();
  expect(within(caption).getByTestId("divinity-talent-node-caption-left-3-cost-inherited")).toBeTruthy();
  expect(within(caption).getByText("150")).toBeTruthy();
  expect(within(caption).getByText("2")).toBeTruthy();
  expect(within(caption).queryByTestId(/cost-gem/)).toBeNull();
  expect(screen.queryByTestId("divinity-talent-node-details")).toBeNull();
});

test("shows the exact minor APK icon and its description without requiring a press", () => {
  renderTree();
  const node = screen.getByTestId("divinity-talent-node-center-2");

  expect(within(node).queryByText("Crit chance")).toBeNull();
  expect(within(node).getByTestId("divinity-talent-node-center-2-icon")).toBeTruthy();

  const caption = screen.getByTestId("divinity-talent-node-caption-center-2");
  expect(within(caption).getByText("Crit chance")).toBeTruthy();
  expect(within(caption).getByText("+2%")).toBeTruthy();
  expect(screen.queryByTestId("divinity-talent-node-details")).toBeNull();
  expect(resolveAssetUri).toHaveBeenCalledWith(
    "/img/divinity/talent-icons/talent-03.png",
  );
});

test("does not expose endpoint letters and marks the selected range by branch glow", () => {
  const firstSelection: DivinityTalentSelections = {
    ...emptySelections,
    left: { a: 3, b: 3, phase: "awaitingB" },
  };
  const { view } = renderTree(firstSelection);
  const singleNode = screen.getByTestId("divinity-talent-node-left-3");

  expect(within(singleNode).getByText("+")).toBeTruthy();
  expect(within(singleNode).queryByText(/A|B/)).toBeNull();
  expect(singleNode.props.accessibilityState).toEqual({ selected: true });
  expect(singleNode.props.accessibilityLabel).toContain("состояние: выбрана");
  expect(singleNode.props.accessibilityLabel).not.toMatch(/точк[аи] [AB]/);
  expect(StyleSheet.flatten(singleNode.props.style)).toMatchObject({
    boxShadow: "0 0 14px rgba(39, 152, 255, 0.95)",
  });

  const completedSelection: DivinityTalentSelections = {
    ...emptySelections,
    left: { a: 3, b: 5, phase: "complete" },
  };
  view.rerender(
    <DivinityTalentTree
      config={divinityTalentConfig}
      onSelectNode={jest.fn(async () => undefined)}
      selections={completedSelection}
    />,
  );

  const aNode = screen.getByTestId("divinity-talent-node-left-3");
  const bNode = screen.getByTestId("divinity-talent-node-left-5");
  expect(within(aNode).getByText("+")).toBeTruthy();
  expect(within(aNode).queryByText("A")).toBeNull();
  expect(within(bNode).queryByText("B")).toBeNull();
  expect(screen.queryByText("A/B")).toBeNull();
  expect(aNode.props.accessibilityLabel).not.toMatch(/точк[аи] [AB]/);
  expect(bNode.props.accessibilityLabel).not.toMatch(/точк[аи] [AB]/);
});

test("normalizes the active range, connects side gaps and leaves other segments inactive", () => {
  renderTree({
    ...emptySelections,
    left: { a: 10, b: 3, phase: "complete" },
  });

  const selectedButtons = screen
    .getAllByRole("button")
    .filter((button) => button.props.accessibilityState?.selected);
  expect(selectedButtons).toHaveLength(6);
  selectedButtons.forEach((button) => {
    expect(button.props.accessibilityLabel).toMatch(/^Левая ветка/);
  });

  [
    "branch-tree-lower-left-5",
    "branch-tree-upper-left-6",
    "branch-tree-lower-left-6",
    "branch-tree-upper-left-7",
  ].forEach((testID) => {
    expect(StyleSheet.flatten(screen.getByTestId(testID).props.style)).toMatchObject({
      backgroundColor: "#2798ff",
      boxShadow: "0 0 8px rgba(39, 152, 255, 0.9)",
    });
  });
  expect(
    StyleSheet.flatten(
      screen.getByTestId("branch-tree-upper-left-11").props.style,
    ),
  ).toMatchObject({
    backgroundColor: "#1e5385",
    boxShadow: "0 0 4px rgba(39, 152, 255, 0.32)",
  });
  expect(
    StyleSheet.flatten(
      screen.getByTestId("branch-tree-active-tail-left-10").props.style,
    ),
  ).toMatchObject({
    backgroundColor: "#2798ff",
    bottom: 0,
    top: 35,
  });
  expect(
    StyleSheet.flatten(
      screen.getByTestId("branch-tree-lower-left-11").props.style,
    ),
  ).toMatchObject({
    backgroundColor: "#1e5385",
    boxShadow: "0 0 4px rgba(39, 152, 255, 0.32)",
  });
  expect(
    StyleSheet.flatten(
      screen.getByTestId("branch-tree-lower-center-1").props.style,
    ),
  ).toMatchObject({
    backgroundColor: "#3b7e28",
    boxShadow: "0 0 4px rgba(98, 239, 69, 0.32)",
  });
});

test("uses AppImage with the configured resource path and fixed square size", () => {
  render(
    <DivinityTalentResourceIcon
      resource={divinityTalentConfig.resources.faith}
      size={14}
      testID="faith-resource-icon"
    />,
  );

  expect(resolveAssetUri).toHaveBeenCalledWith(
    "/img/divinity/talents/faith-combined.png",
  );
  expect(screen.UNSAFE_getByType(Image).props.source).toEqual({
    cache: "force-cache",
    uri: "resolved:/img/divinity/talents/faith-combined.png",
  });
  expect(
    StyleSheet.flatten(screen.getByTestId("faith-resource-icon").props.style),
  ).toMatchObject({ height: 14, width: 14 });
  expect(screen.getByTestId("faith-resource-icon-placeholder")).toBeTruthy();
});

test("keeps static tree geometry and exact costs stable across selection changes", () => {
  const costLookup = jest.mocked(getDivinityTalentNodeCost);
  costLookup.mockClear();
  const onSelectNode = jest.fn(async () => undefined);
  const { view } = renderTree(emptySelections, onSelectNode);

  expect(costLookup).toHaveBeenCalledTimes(76);

  view.rerender(
    <DivinityTalentTree
      config={divinityTalentConfig}
      onSelectNode={onSelectNode}
      selections={{
        ...emptySelections,
        center: { a: 1, b: 4, phase: "complete" },
      }}
    />,
  );

  expect(costLookup).toHaveBeenCalledTimes(76);
});

test("consumes a rejected async selection at the press boundary", async () => {
  const onSelectNode = jest.fn(() => Promise.reject(new Error("write failed")));
  renderTree(emptySelections, onSelectNode);
  const node = screen.getByTestId("divinity-talent-node-center-1");

  fireEvent.press(node);
  await Promise.resolve();

  expect(onSelectNode).toHaveBeenCalledWith("center", 1);
});

test("shows only non-zero branch-resource prices in permanent node captions", () => {
  renderTree();
  const caption = screen.getByTestId("divinity-talent-node-caption-left-7");
  const costList = within(caption).getByTestId(
    "divinity-talent-node-caption-left-7-cost-list",
  );

  ["faith", "inherited"].forEach((key) => {
    expect(
      within(caption).getByTestId(
        `divinity-talent-node-caption-left-7-cost-${key}`,
      ),
    ).toBeTruthy();
  });
  expect(within(caption).queryByTestId(/cost-gem/)).toBeNull();
  expect(StyleSheet.flatten(costList.props.style)).toMatchObject({
    flexWrap: "wrap",
    minWidth: 0,
    width: "100%",
  });
});

test("shows exact APK connector meaning without treating it as a purchase", () => {
  renderTree();

  expect(screen.queryByText("Лимит +1")).toBeNull();
  expect(screen.queryByText("Узлы божественной энергии")).toBeNull();
  expect(
    screen.getAllByLabelText(
      "Узлы божественной энергии. Предел узлов божественной энергии +1",
    ),
  ).toHaveLength(4);
  expect(screen.getAllByRole("button")).toHaveLength(76);
});

test("shows three resource cards with a heading above each icon and cost", () => {
  const resources: DivinityTalentRequiredResources = {
    selectedNodeCount: 2,
    faith: 0,
    inheritedDivinity: 0,
    resonanceStone: 20,
  };

  render(
    <DivinityTalentSummary
      config={divinityTalentConfig}
      resources={resources}
    />,
  );

  expect(screen.getByText("Расход ресурсов")).toBeTruthy();
  expect(screen.getByLabelText("Выбрано нод: 2")).toBeTruthy();
  expect(
    StyleSheet.flatten(
      screen.getByTestId("divinity-talent-summary-resource-list").props.style,
    ),
  ).toMatchObject({ gap: 10, width: "100%" });
  expect(
    StyleSheet.flatten(
      screen.getByTestId("divinity-talent-summary-row-resonance").props.style,
    ),
  ).toMatchObject({
    alignItems: "center",
    flexDirection: "column",
    width: "100%",
  });
  [
    { key: "faith", label: "Очки веры", value: "0" },
    { key: "inherited", label: "Унаследованная божественность", value: "0" },
    { key: "resonance", label: "Резонансный камень божественности", value: "20" },
  ].forEach(({ key, label, value }) => {
    const row = screen.getByTestId(`divinity-talent-summary-row-${key}`);
    expect(within(row).getByText(label)).toBeTruthy();
    expect(within(row).getByText(":")).toBeTruthy();
    expect(within(row).getByText(value)).toBeTruthy();
    expect(within(row).getByText(label)).toHaveStyle({ textAlign: "center" });
    expect(row).toHaveStyle({ flexDirection: "column" });
  });
  [
    "Требуется Очки веры: 0",
    "Требуется Унаследованная божественность: 0",
    "Требуется Резонансный камень божественности: 20",
  ].forEach((label) => {
    const semantic = screen.getAllByLabelText(label);
    expect(semantic).toHaveLength(1);
    expect(semantic[0].props.accessibilityRole).toBe("text");
  });

  const decorativeFaithIcon = screen.getByTestId(
    "divinity-talent-summary-icon-faith",
    { includeHiddenElements: true },
  );
  expect(decorativeFaithIcon.props.accessible).toBe(false);
  expect(decorativeFaithIcon.props.accessibilityLabel).toBeUndefined();
  expect(screen.queryByText(/Самоцвет божественности/)).toBeNull();
});

test("exposes complete cost and selection state on a standalone node", () => {
  const centerLevelOne = divinityTalentConfig.branches
    .find((branch) => branch.id === "center")
    ?.nodes.find((node) => node.level === 1);

  expect(centerLevelOne).toBeDefined();
  if (!centerLevelOne) {
    return;
  }

  render(
    <DivinityTalentNode
      active={false}
      branchLabel="Центральная"
      costLabel="нет расхода ресурсов"
      node={centerLevelOne}
      onPress={jest.fn()}
      tone="green"
    />,
  );

  expect(
    screen.getByLabelText(
      "Центральная ветка, уровень 1, большая нода, стоимость: нет расхода ресурсов, состояние: не выбрана",
    ),
  ).toBeTruthy();
});
jest.mock("@/shared/ui/useImageLoadingTransition", () =>
  jest.requireActual("@/shared/ui/testing/stableImageLoadingTransition"),
);
