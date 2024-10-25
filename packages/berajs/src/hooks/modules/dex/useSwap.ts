import { BalancerSDK, BatchSwap, SwapType } from "@balancer-labs/sdk";
import {
  ExactInQueryOutput,
  SwapBuildOutputExactIn,
  Token,
  TokenAmount,
} from "@balancer/sdk";
import { chainId, jsonRpcUrl } from "@bera/config";
import { parseFixed } from "@ethersproject/bignumber";
import { BigNumber } from "ethers";
import useSWR from "swr";
import { parseUnits } from "viem";
import { usePublicClient } from "wagmi";

import {
  Slippage,
  Swap,
  SwapBuildCallInput,
  SwapInput,
  SwapKind,
  balancerClient,
} from "~/actions";
import { balancerApi } from "~/actions/dex/b-sdk";
import { useBeraJs } from "~/contexts";
import { SwapRequest, type DefaultHookOptions } from "~/types";

type IUsePollSwapsArgs = SwapRequest;
interface IUsePollSwapsOptions extends DefaultHookOptions {
  isTyping?: boolean | undefined;
}

export interface SwapInfo {
  batchSwapSteps: IBalancerSwapStep[];
  formattedSwapAmount: string;
  formattedReturnAmount: string;
  formattedAmountIn: string;
  amountIn: bigint;
  returnAmount: bigint;
  tokenIn: string;
  tokenOut: string;
  predictedAmountOut: bigint;
  formattedPredictedAmountOut: string;
  error: any;
}

export interface IBalancerSwapStep {
  poolId: string;
  assetInIndex: number;
  assetOutIndex: number;
  amountIn: string;
  amountOut: string;
  kind: "exactIn" | "exactOut";
}

export interface UsePollBalancerSwapReturn extends ExactInQueryOutput {
  call: SwapBuildOutputExactIn;
}

/**
 * Polls a pair for the optimal route and amount for a swap using Balancer SDK
 * test with test with http://localhost:3000/swap/?inputCurrency=WBERA&outputCurrency=HONEY
 */
export const usePollBalancerSwap = (
  args: IUsePollSwapsArgs,
  options?: IUsePollSwapsOptions,
) => {
  // const poolId =
  //   "0xbbc5bde7e68ee3c71ba23f3a04133ad688e41ebf000100000000000000000003";
  // const poolAddress = "0xbbc5bde7e68ee3c71ba23f3a04133ad688e41ebf";
  // const { tokenIn, tokenOut, amount, tokenInDecimals, tokenOutDecimals } = args; FIXME: hardcoding this
  // const tokenIn = "0x0e4aaf1351de4c0264c5c7056ef3777b41bd8e03" as `0x${string}`; // HONEY
  // const tokenOut =
  //   "0xd6d83af58a19cd14ef3cf6fe848c9a4d21e5727c" as `0x${string}`; // USDC
  const { tokenIn, tokenOut, amount, tokenInDecimals, tokenOutDecimals } = args;

  const publicClient = usePublicClient();
  const { account } = useBeraJs();
  const QUERY_KEY =
    options?.isTyping || publicClient || !account
      ? [tokenIn, tokenOut, amount]
      : null;

  return useSWR(
    QUERY_KEY,
    async () => {
      if (!publicClient || !account) return undefined;

      // some data that we are hardcoding for the swap from HONEY -> USDC 0 -> 2
      // http://localhost:3000/swap/?inputCurrency=HONEY&outputCurrency=USDC
      //   const inIndex = 0;
      //   const outIndex = 2;
      const amountBI = parseUnits("1", tokenInDecimals ?? 18);
      //   const amountBN = BigNumber.from(amountBI); // FIXME: this seems really dumb that we have to do this
      //   const gasPrice = parseFixed("1", 9); // FIXME: we should be doing this dynamically
      const deadline = 10000n; // FIXME: this is a placeholder

      // ///////////////////////////// V3 SDK with SOR /////////////////////////////
      const tokenInV3 = new Token(chainId, tokenIn, tokenInDecimals);
      const tokenOutV3 = new Token(chainId, tokenOut, tokenOutDecimals ?? 6);
      const tokenAmount = TokenAmount.fromHumanAmount(tokenInV3, "1");
      const swapKind = SwapKind.GivenIn;
      const sorPaths = await balancerApi.sorSwapPaths.fetchSorSwapPaths({
        // FIXME: this throws: There was an error with swap simulation: Error: Unsupported API chain: 80084
        chainId,
        tokenIn: tokenInV3.address,
        tokenOut: tokenOutV3.address,
        swapKind,
        swapAmount: tokenAmount,
      });

      const swapInput = {
        chainId,
        paths: sorPaths,
        swapKind,
        userData: "0x" as `0x${string}`,
      };

      const swap = new Swap(swapInput);
      const queryOutput = await swap.query(jsonRpcUrl);

      console.log("SOOOR QUERY", swap, queryOutput);

      if (queryOutput.swapKind !== SwapKind.GivenIn) {
        throw new Error("Swap kind is not GivenIn");
      }

      if (!queryOutput.expectedAmountOut) {
        throw new Error("No path amounts returned");
      }

      return {
        ...queryOutput,
        swapPaths: sorPaths,
        call: swap.buildCall({
          slippage: Slippage.fromPercentage("1"),
          deadline,
          queryOutput,
          sender: account,
          recipient: account,
          wethIsEth: true,
        }),
      };
    },
    {
      ...options?.opts,
    },
  );
};
