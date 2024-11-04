import { useCallback, useEffect, useState } from "react";
import { chainId, jsonRpcUrl } from "@bera/config";
import {
  AddLiquidity,
  AddLiquidityInput,
  AddLiquidityKind,
  AddLiquidityQueryOutput,
  PoolState,
  PriceImpact,
  PriceImpactAmount,
  Slippage,
} from "@berachain-foundation/berancer-sdk";
import { Address, parseUnits } from "viem";

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

  const [isLoading, setIsLoading] = useState(false);
  const [priceImpact, setPriceImpact] = useState<PriceImpactAmount>();

  const [queryOutput, setQueryOutput] = useState<AddLiquidityQueryOutput>();

  const fetch = useCallback(async () => {
    if (!pool || !input) return;
    // console.log("POOL", pool);

    setIsLoading(true);

    const addLiquidity = new AddLiquidity();

    if (
      input.some(
        (i) => pool.tokens.findIndex((t) => t.address === i.address) === -1,
      )
    ) {
      throw new Error("Some input tokens are not in the pool");
    }

    const addLiquidityInput: AddLiquidityInput = {
      chainId,
      kind: AddLiquidityKind.Unbalanced,
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
    };

    const [queryOutput, priceImpact] = await Promise.all([
      addLiquidity.query(addLiquidityInput, pool),
      PriceImpact.addLiquidityUnbalanced(addLiquidityInput, pool),
    ]);

    setPriceImpact(priceImpact);
    setQueryOutput(queryOutput);
    setIsLoading(false);
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
    priceImpact,
    isLoading,
    input,
    setInput,
  };
};
