jest.mock("@/shared/lib/resolveAssetUri", () => ({
  __esModule: true,
  resolveAssetUri: jest.fn((assetPath: string) => `resolved:${assetPath}`),
}));

import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import {
  divinityBranches,
  divinitySkills,
  divinityTreeTemplate,
} from "@/features/game-data/divinity";
import type {
  BranchColumn,
  DraftBranchColumns,
} from "@/features/game-data/divinity";

import { BranchBuilderGrid } from "../BranchBuilderGrid";

const columns: readonly BranchColumn[] = [
  { id: "left", label: "Left", isMain: false },
  { id: "center", label: "Center", isMain: true },
  { id: "right", label: "Right", isMain: false },
];

const selectedBranches: DraftBranchColumns = {
  left: "asterial",
  center: "psyche",
  right: "immortality",
};

const centerSkill = divinitySkills.find(
  (skill) => skill.branchId === "psyche" && skill.tier === 1,
);

if (!centerSkill) {
  throw new Error("Missing tier 1 psyche skill fixture");
}

const selectedMajorSkills = { "center:1": centerSkill.id };

function renderGrid(
  readOnly: boolean,
  onOpenMajorSlot = jest.fn(),
  activeMajorSlot: { columnId: "center"; level: number } | null = null,
) {
  return render(
    <BranchBuilderGrid
      activeMajorSlot={activeMajorSlot}
      branches={divinityBranches}
      columns={columns}
      onOpenMajorSlot={onOpenMajorSlot}
      progressLevels={{ left: 30, center: 30, right: 30 }}
      readOnly={readOnly}
      selectedBranches={selectedBranches}
      selectedMajorSkills={selectedMajorSkills}
      skillCatalog={divinitySkills}
      skills={divinitySkills}
      template={divinityTreeTemplate}
    />,
  );
}

test("read-only hero build shows minor effects and compact major labels without descriptions", () => {
  renderGrid(true);

  const minorNode = screen.getByTestId("branch-node-center-2");
  expect(StyleSheet.flatten(minorNode.props.style)).toMatchObject({
    borderRadius: 999,
    height: 46,
    width: 46,
  });
  expect(
    within(minorNode).getByTestId("branch-node-center-2-icon"),
  ).toBeTruthy();
  expect(minorNode.props.accessibilityRole).toBe("image");
  const minorCaption = screen.getByTestId("branch-node-caption-center-2");
  expect(within(minorCaption).getByText("Crit chance")).toBeTruthy();
  expect(within(minorCaption).getByText("+2%")).toBeTruthy();

  const majorCaption = screen.getByTestId("branch-node-caption-center-1");
  expect(within(majorCaption).getByText(centerSkill.name)).toBeTruthy();
  expect(within(majorCaption).queryByText(/Уровень/)).toBeNull();
  expect(
    within(majorCaption).queryByText(centerSkill.levels[3].description),
  ).toBeNull();
  expect(screen.queryByTestId("branch-node-details")).toBeNull();
  expect(screen.queryByText("Лимит +1")).toBeNull();
});

test("editable builder keeps the circular major node as the skill picker trigger", () => {
  const onOpenMajorSlot = jest.fn();
  renderGrid(false, onOpenMajorSlot);

  const majorNode = screen.getByTestId("branch-node-center-1");
  expect(StyleSheet.flatten(majorNode.props.style)).toMatchObject({
    borderRadius: 999,
    height: 64,
    width: 64,
  });

  fireEvent.press(majorNode);

  expect(onOpenMajorSlot).toHaveBeenCalledWith("center", 1);
  expect(screen.queryByTestId("branch-node-details")).toBeNull();
  expect(screen.getByTestId("branch-node-caption-center-1")).toBeTruthy();
  expect(
    screen.queryByLabelText("Clear skill for center level 1"),
  ).toBeNull();
});

test("lays out the skill picker as one bounded dropdown below the major caption", () => {
  renderGrid(false, jest.fn(), { columnId: "center", level: 1 });

  const picker = screen.getByTestId("major-skill-picker-center-1");
  expect(StyleSheet.flatten(picker.props.style)).toMatchObject({
    alignSelf: "center",
    backgroundColor: "#241610",
    borderColor: "#62ef45",
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 140,
    padding: 8,
    width: "100%",
  });
  const option = within(picker).getAllByRole("button")[0];
  expect(StyleSheet.flatten(option.props.style)).toMatchObject({
    alignItems: "center",
    flexDirection: "column",
  });
  expect(
    within(screen.getByTestId("branch-tree-node-caption-stage-center-1"))
      .getByTestId("major-skill-picker-center-1"),
  ).toBeTruthy();
});

test("excludes branches selected by other columns from the picker", () => {
  renderGrid(false);

  fireEvent.press(screen.getByLabelText("Choose branch for Left"));

  expect(screen.getByLabelText("Select Asterial Skills for Left")).toBeTruthy();
  expect(screen.queryByLabelText("Select Psyche Skills for Left")).toBeNull();
  expect(
    screen.queryByLabelText("Select Immortality Skills for Left"),
  ).toBeNull();
});
jest.mock("@/shared/ui/useImageLoadingTransition", () =>
  jest.requireActual("@/shared/ui/testing/stableImageLoadingTransition"),
);
