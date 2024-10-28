import { useState } from "react";
import { PoolState } from "@balancer/sdk";
import { useTokens, type PoolV2 } from "@bera/berajs";

export const useWithdrawLiquidity = (pool: PoolState | undefined) => {
  const [amount, setAmount] = useState<number>(0);

  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const { data: tokenData } = useTokens();
  const poolPrice = 0;
  return {
    poolPrice,
    tokenDictionary: tokenData?.tokenDictionary,
    amount,
    setAmount,
    previewOpen,
    setPreviewOpen,
  };
};
