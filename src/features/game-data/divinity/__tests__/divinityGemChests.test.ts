import * as divinityData from "..";

const fs = jest.requireActual("fs") as {
  existsSync: (filePath: string) => boolean;
};

const expectedChests = [
  {
    id: "600001",
    name: "Персон. сундук с самоцветом божественности",
    icon: "/img/divinity/chests/chest-600001.png",
    contents: [
      { resourceId: 700361, gemLevel: 1, amount: 20 },
      { resourceId: 700362, gemLevel: 2, amount: 12 },
      { resourceId: 700363, gemLevel: 3, amount: 6 },
      { resourceId: 700364, gemLevel: 4, amount: 4 },
      { resourceId: 700365, gemLevel: 5, amount: 3 },
    ],
  },
  {
    id: "600076",
    name: "Большой персонализированный сундук с самоцветом божественности",
    icon: "/img/divinity/chests/chest-600076.png",
    contents: [
      { resourceId: 700361, gemLevel: 1, amount: 40 },
      { resourceId: 700362, gemLevel: 2, amount: 24 },
      { resourceId: 700363, gemLevel: 3, amount: 12 },
      { resourceId: 700364, gemLevel: 4, amount: 8 },
      { resourceId: 700365, gemLevel: 5, amount: 6 },
      { resourceId: 700366, gemLevel: 6, amount: 4 },
      { resourceId: 700367, gemLevel: 7, amount: 3 },
    ],
  },
];

const { divinityGemChests } = divinityData as typeof divinityData & {
  divinityGemChests?: unknown;
};

test("exposes the two gem-only personalized chests from the APK", () => {
  expect(divinityGemChests).toEqual(expectedChests);
});

test("references existing public chest icons", () => {
  expectedChests.forEach((chest) => {
    expect(chest.icon).toMatch(/^\/img\//);
    expect(
      fs.existsSync(`${process.cwd()}/public${chest.icon}`),
    ).toBe(true);
  });
});
