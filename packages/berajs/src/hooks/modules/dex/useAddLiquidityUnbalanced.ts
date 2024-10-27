import { useCallback, useEffect, useState } from "react";
import {
  AddLiquidityBuildCallOutput,
  AddLiquidityQueryOutput,
  PoolState,
  QueryOutputBase,
  Slippage,
  parseAddLiquidityArgs,
} from "@balancer/sdk";
import { chainId, jsonRpcUrl } from "@bera/config";
import { Address, parseUnits } from "viem";

import { AddLiquidity, BalSDK } from "~/actions/dex/b-sdk";

export interface UseAddLiquidityArgs {
  pool: PoolState | undefined;
}

export const useAddLiquidityUnbalanced = ({ pool }: UseAddLiquidityArgs) => {
  const [input, setInput] = useState<
    {
      address: Address;
      amount: string;
    }[]
  >([]);

  const [queryOutput, setQueryOutput] = useState<AddLiquidityQueryOutput>();

  const fetch = useCallback(async () => {
    if (!pool || !input) return;
    // console.log("POOL", pool);

    const addLiquidity = new AddLiquidity();

    if (
      input.some(
        (i) => pool.tokens.findIndex((t) => t.address === i.address) === -1,
      )
    ) {
      throw new Error("Some input tokens are not in the pool");
    }

    const queryOutput = await addLiquidity.query(
      {
        chainId,
        kind: BalSDK.AddLiquidityKind.Unbalanced,
        rpcUrl: jsonRpcUrl,
        amountsIn: pool.tokens
          .filter((t) => input.findIndex((i) => i.address === t.address) !== -1)
          .map((t) => {
            const i = input.find((i) => i.address === t.address)!;
            return {
              rawAmount: parseUnits(i.amount, t.decimals),
              decimals: t?.decimals,
              address: i.address as Address,
            };
          }),
      },
      pool,
    );

    setQueryOutput(queryOutput);
  }, [pool, input]);

  const getCallData = useCallback(
    (slippage: number, sender: Address) => {
      if (!queryOutput) throw new Error("Query output is not set");

      if (!pool) throw new Error("Pool is not set");

      const addLiquidity = new AddLiquidity();

      return addLiquidity.buildCall({
        ...queryOutput,
        chainId,
        sender,
        poolId: pool.id,
        recipient: sender,
        wethIsEth: false,

        slippage: Slippage.fromPercentage(slippage.toString() as `${number}`),
      });
    },
    [queryOutput, pool],
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    getCallData,
    queryOutput,
    input,
    setInput,
  };
};
