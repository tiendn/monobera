import { useCallback, useEffect, useState } from "react";
import { ADDRESS_ZERO } from "@bera/berajs";
import { chainId, jsonRpcUrl } from "@bera/config";
import {
  AddLiquidity,
  AddLiquidityInput,
  AddLiquidityKind,
  AddLiquidityQueryOutput,
  PoolState,
  Slippage,
} from "@berachain-foundation/berancer-sdk";
import { Address, parseUnits } from "viem";

import { UseAddLiquidityArgs } from "./useAddLiquidityUnbalanced";

export const useAddLiquidityProportional = ({
  pool,
  wethIsEth,
}: UseAddLiquidityArgs) => {
  const [input, setInput] = useState<{
    address: Address;
    amount: string;
  }>();

  const [isLoading, setIsLoading] = useState(false);

  const [queryOutput, setQueryOutput] = useState<AddLiquidityQueryOutput>();

  const fetch = useCallback(async () => {
    if (!pool || !input) return;
    // console.log("POOL", pool);

    setIsLoading(true);

    const addLiquidity = new AddLiquidity();

    const tokenInput = pool.tokens.find((t) => t.address === input.address);
    if (!tokenInput) {
      throw new Error("Input token is not in the pool");
    }

    const addLiquidityInput: AddLiquidityInput = {
      chainId,
      kind: AddLiquidityKind.Proportional,
      rpcUrl: jsonRpcUrl,
      referenceAmount: {
        rawAmount: parseUnits(input.amount, tokenInput.decimals),
        decimals: tokenInput?.decimals,
        address: input.address as Address,
      },
    };

    const [queryOutput, priceImpact] = await Promise.all([
      addLiquidity.query(addLiquidityInput, pool),
      0, //PriceImpact.(addLiquidityInput, pool),
    ]);

    setQueryOutput(queryOutput);
    setIsLoading(false);
  }, [pool, input]);

  const getCallData = useCallback(
    (sender: Address) => {
      if (!queryOutput || !input) throw new Error("Query output is not set");

      if (!pool) throw new Error("Pool is not set");

      const addLiquidity = new AddLiquidity();

      return addLiquidity.buildCall({
        ...queryOutput,
        chainId,
        sender,
        poolId: pool.id,
        recipient: sender,
        wethIsEth: wethIsEth,
        slippage: Slippage.fromPercentage("0"),
      });
    },
    [queryOutput, pool, wethIsEth],
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    getCallData,
    queryOutput,
    isLoading,
    input,
    setInput,
  };
};
