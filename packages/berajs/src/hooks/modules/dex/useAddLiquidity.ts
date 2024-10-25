import { useCallback, useEffect, useState } from "react";
import {
  AddLiquidityQueryOutput,
  PoolState,
  QueryOutputBase,
} from "@balancer/sdk";
import { chainId, jsonRpcUrl } from "@bera/config";
import { Address, parseUnits } from "viem";

import { AddLiquidity, BalSDK } from "~/actions/dex/b-sdk";
import { Token } from "~/types";

export interface UseAddLiquidityArgs {
  pool: PoolState | undefined;
  token: Token;
}

export const useAddLiquidity = ({ pool }: UseAddLiquidityArgs) => {
  const [input, setInput] = useState<{
    address: Address;
    amount: string;
  }>();

  const [queryOutput, setQueryOutput] = useState<AddLiquidityQueryOutput>();

  const fetch = useCallback(async () => {
    if (!pool || !input) return;
    // console.log("POOL", pool);

    const addLiquidity = new AddLiquidity();

    const selectedToken = pool.tokens.find((t) => t.address === input?.address);

    if (!selectedToken) throw new Error("Selected token not found in pool");

    const queryOutput = await addLiquidity.query(
      {
        chainId: chainId,
        kind: BalSDK.AddLiquidityKind.Proportional,
        rpcUrl: jsonRpcUrl,
        referenceAmount: {
          rawAmount: parseUnits(input.amount, selectedToken.decimals),
          decimals: selectedToken?.decimals ?? 18,
          address: selectedToken!.address as Address,
        },
      },
      pool,
    );

    setQueryOutput(queryOutput);
    console.log("QUERYOUTPUT", queryOutput);
  }, [pool]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    queryOutput,
    input,
    setInput,
  };
};
