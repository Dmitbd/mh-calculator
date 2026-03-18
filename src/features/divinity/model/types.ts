export type StoneCosts = {
  stone5: number;
  stone6: number;
  stone7: number;
};

export type DivinityStep = {
  fromLevel: number;
  toLevel: number;
  label: string;
  tapCost: StoneCosts;
  finishCost: StoneCosts;
  totalCost: StoneCosts;
};
