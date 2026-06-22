import {
  getBuildTargetLeafTabs,
  getBuildTargetPathKey,
  getBuildTargetPathLabel,
} from "../model/multiBuildExport";
import { buildTargetTabs } from "../data/buildTargetTabs";

describe("multiBuildExport target helpers", () => {
  test("returns all build target leaf paths", () => {
    expect(getBuildTargetLeafTabs(buildTargetTabs).map((leaf) => leaf.path)).toEqual([
      ["pvp"],
      ["pve", "bosses"],
      ["pve", "campaign"],
    ]);
  });

  test("creates stable path keys and labels", () => {
    expect(getBuildTargetPathKey(["pve", "bosses"])).toBe("pve/bosses");
    expect(getBuildTargetPathLabel(buildTargetTabs, ["pve", "bosses"])).toBe(
      "PvE -> Боссы",
    );
  });
});
