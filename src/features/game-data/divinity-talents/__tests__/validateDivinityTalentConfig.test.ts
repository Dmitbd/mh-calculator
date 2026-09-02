import rawDivinityTalentConfig from "../divinity-talent-costs.json";
import { validateDivinityTalentConfig } from "../validateDivinityTalentConfig";

type RawConfig = typeof rawDivinityTalentConfig;

type MalformedConfigCase = {
  name: string;
  mutate: (config: RawConfig) => void;
  expectedError: RegExp;
};

const malformedConfigCases: MalformedConfigCase[] = [
  {
    name: "rejects a wrong schema version",
    mutate: (config) => {
      config.schemaVersion = 2;
    },
    expectedError: /schema version/,
  },
  {
    name: "rejects a wrong client source",
    mutate: (config) => {
      config.source.clientVersion = "1.49.0";
    },
    expectedError: /source/,
  },
  {
    name: "rejects duplicate node levels",
    mutate: (config) => {
      config.branches[0].nodeLevels[1] = config.branches[0].nodeLevels[0];
    },
    expectedError: /duplicate left node levels/,
  },
  {
    name: "rejects unordered node levels",
    mutate: (config) => {
      [config.branches[0].nodeLevels[0], config.branches[0].nodeLevels[1]] = [
        config.branches[0].nodeLevels[1],
        config.branches[0].nodeLevels[0],
      ];
    },
    expectedError: /unordered left node levels/,
  },
  {
    name: "rejects a major level without a node",
    mutate: (config) => {
      config.branches[1].majorLevels[0] = 3;
    },
    expectedError: /major level has no node/,
  },
  {
    name: "rejects a wrong faith resource id",
    mutate: (config) => {
      config.resources.faith.resourceIds[0] = 700304;
    },
    expectedError: /faith resource id/,
  },
  {
    name: "rejects a wrong inherited-divinity resource id",
    mutate: (config) => {
      config.resources.inheritedDivinity.resourceId = 700301;
    },
    expectedError: /inherited divinity resource id/,
  },
  {
    name: "rejects a negative base cost",
    mutate: (config) => {
      config.levelCosts[0].faith = -1;
    },
    expectedError: /level 1 faith cost/,
  },
  {
    name: "rejects a fractional extra cost",
    mutate: (config) => {
      config.branches[0].inheritedDivinityByLevel["3"] = 1.5;
    },
    expectedError: /left inherited divinity costs 3/,
  },
  {
    name: "rejects an incomplete minor-node catalog",
    mutate: (config) => {
      config.branches[1].minorNodes.shift();
    },
    expectedError: /incomplete center minor nodes/,
  },
  {
    name: "rejects a major level described as a minor node",
    mutate: (config) => {
      config.branches[1].minorNodes[0].level = 1;
    },
    expectedError: /invalid center minor node level/,
  },
  {
    name: "rejects an extra-cost level without a node",
    mutate: (config) => {
      Object.assign(config.branches[1].resonanceStoneByLevel, { "3": 1 });
    },
    expectedError: /center resonance stone costs level/,
  },
];

test.each(malformedConfigCases)(
  "$name",
  ({ mutate, expectedError }) => {
    const config = structuredClone(rawDivinityTalentConfig);
    mutate(config);

    expect(() => validateDivinityTalentConfig(config)).toThrow(expectedError);
  },
);
