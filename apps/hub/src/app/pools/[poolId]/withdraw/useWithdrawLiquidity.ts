import { useCallback, useEffect, useState } from "react";
import { useBeraJs } from "@bera/berajs";
import { chainId, jsonRpcUrl } from "@bera/config";
import {
  PoolState,
  RemoveLiquidity,
  RemoveLiquidityKind,
  RemoveLiquidityQueryOutput,
  Slippage,
} from "@berachain-foundation/berancer-sdk";
import { Address, parseUnits } from "viem";

export interface UseRemoveLiquidityProportionalArgs {
  pool: PoolState | undefined;
}

export const useRemoveLiquidityProportional = ({
  pool,
}: UseRemoveLiquidityProportionalArgs) => {
  const { account } = useBeraJs();
  const [bptIn, setBptIn] = useState<bigint>(0n);

  const [queryOutput, setQueryOutput] = useState<RemoveLiquidityQueryOutput>();

  const fetch = useCallback(async () => {
    if (!pool || !bptIn) return;

    const removeLiquidity = new RemoveLiquidity();

    const queryOutput = await removeLiquidity.query(
      {
        chainId: chainId,
        kind: RemoveLiquidityKind.Proportional,
        rpcUrl: jsonRpcUrl,
        bptIn: {
          address: pool.address,
          decimals: 18,
          rawAmount: bptIn,
        },
      },
      pool,
    );

    setQueryOutput(queryOutput);
  }, [pool, bptIn]);

  const getCallData = useCallback(
    (slippage: number) => {
      if (!queryOutput) throw new Error("Query output is not set");

      if (!pool) throw new Error("Pool is not set");

      const removeLiquidity = new RemoveLiquidity();

      console.log("SENDER", account);

      return removeLiquidity.buildCall({
        ...queryOutput,
        chainId,
        recipient: account,
        sender: account,
        poolId: pool.id,
        wethIsEth: false,
        slippage: Slippage.fromPercentage(slippage.toString() as `${number}`),
      });
    },
    [queryOutput, pool, account],
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    bptIn,
    setBptIn,
    queryOutput,
    getCallData,
  };
};
