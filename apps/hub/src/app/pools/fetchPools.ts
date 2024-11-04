import { isIPFS } from "@bera/config";
import BigNumber from "bignumber.js";

export const getPoolUrl = (
  pool: { id: string } | undefined,
  isMyPool = false,
): string => {
  if (!pool) return "";
  if (isIPFS) {
    return `/pools/details/?address=${pool?.id}${
      isMyPool ? "&back=my-pools" : ""
    }`;
  }
  return `/pools/${pool?.id}/details/${isMyPool ? "?back=my-pools" : ""}`;
};

export const getPoolAddLiquidityUrl = (pool: { id: string } | undefined) => {
  if (!pool) return "";

  if (isIPFS) {
    return `/pools/deposit/?address=${pool?.id}`;
  }

  return `/pools/${pool?.id}/deposit/`;
};

export const getPoolWithdrawUrl = (pool: { id: string } | undefined) => {
  if (!pool) return "";
  return `/pools/${pool?.id}/withdraw/`;
};

export const getBaseCost = (initialPrice: number) => {
  if (initialPrice === 0) return 0;
  return 1 / initialPrice;
};

export const getQuoteCost = (initialPrice: number) => {
  if (initialPrice === 0) return 0;
  return 1 * initialPrice;
};

export const getBaseCostBN = (initialPrice: string): string => {
  const bnInitialPrice = new BigNumber(initialPrice);
  if (bnInitialPrice.isZero()) return "0";
  // Perform division and convert the result to a string
  return new BigNumber(1).dividedBy(bnInitialPrice).toFixed();
};

export const getQuoteCostBN = (initialPrice: string): string => {
  const bnInitialPrice = new BigNumber(initialPrice);
  if (bnInitialPrice.isZero()) return "0";
  // Perform multiplication (though unnecessary as it's by 1) and convert the result to a string
  return new BigNumber(1).multipliedBy(bnInitialPrice).toFixed();
};
