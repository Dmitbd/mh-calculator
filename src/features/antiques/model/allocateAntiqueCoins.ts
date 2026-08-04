import { normalizeAntiqueCount } from "./normalizeAntiqueInput";
import type { AntiqueCoinAllocation } from "./types";

type AntiqueMapConversionInput = {
  coins: unknown;
  templeMapAllocation: unknown;
};

export function getCoinAllocation(
  coins: unknown,
  templeMapAllocation: unknown,
): AntiqueCoinAllocation {
  const normalizedCoins = normalizeAntiqueCount(coins);
  const maxTempleMaps = Math.floor(normalizedCoins / 1_000);
  const templeMaps = Math.min(
    normalizeAntiqueCount(templeMapAllocation),
    maxTempleMaps,
  );
  const spendableCoins = Math.floor(normalizedCoins / 500) * 500;

  return {
    spendableCoins,
    unusedCoins: normalizedCoins - spendableCoins,
    tombMaps: spendableCoins / 500 - templeMaps * 2,
    templeMaps,
    templeMapAllocation: templeMaps,
  };
}

export function convertToTempleMap({
  coins,
  templeMapAllocation,
}: AntiqueMapConversionInput): number {
  const allocation = getCoinAllocation(coins, templeMapAllocation);
  const maxTempleMaps = Math.floor(normalizeAntiqueCount(coins) / 1_000);

  return Math.min(allocation.templeMapAllocation + 1, maxTempleMaps);
}

export function convertToTombMaps({
  coins,
  templeMapAllocation,
}: AntiqueMapConversionInput): number {
  const allocation = getCoinAllocation(coins, templeMapAllocation);

  return Math.max(allocation.templeMapAllocation - 1, 0);
}
