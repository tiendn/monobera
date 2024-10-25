import {
  Path,
  Slippage,
  Swap,
  SwapBuildOutputExactIn,
  SwapBuildOutputExactOut,
  SwapKind,
  Token,
  TokenAmount,
  ZERO_ADDRESS,
} from "@balancer/sdk";
import { chainId } from "@bera/config";
import useSWR from "swr";
import { formatUnits } from "viem";
import { usePublicClient } from "wagmi";

import { balancerApi, nativeToken } from "~/actions/dex/b-sdk";
import { useBeraJs } from "~/contexts";
import { SwapRequest, type DefaultHookOptions } from "~/types";
import { useSlippage } from "../../../../../shared-ui/src";

type IUsePollSwapsArgs = SwapRequest;
interface IUsePollSwapsOptions extends DefaultHookOptions {
  isTyping?: boolean | undefined;
}

// NOTE: isLoading and error are injected by SWR so we dont need to define them here
export interface SwapInfoV4 {
  swapKind: SwapKind;
  expectedAmountOut: TokenAmount;
  amountIn: TokenAmount;
  expectedAmountOutFormatted: string;
  amountInFormatted: string;
  buildCall: (
    slippagePercent?: `${number}`,
    deadlineIn?: number,
  ) => SwapBuildOutputExactIn | SwapBuildOutputExactOut;
  swapPaths: Path[];
}

// NOTE: this is used when generating typings
function getEmptyResponse(): SwapInfoV4 {
  return {
    swapPaths: [] as Path[],
    swapKind: SwapKind.GivenIn,
    expectedAmountOut: TokenAmount.fromHumanAmount(nativeToken, "0"),
    amountIn: TokenAmount.fromHumanAmount(nativeToken, "0"),
    expectedAmountOutFormatted: "0",
    amountInFormatted: "0",
    buildCall: () =>
      ({
        swapAmount: BigInt(0),
        returnAmount: BigInt(0),
        amountIn: BigInt(0),
        amountOut: BigInt(0),
        swapKind: SwapKind.GivenIn,
        assets: [],
        encodedCallData: "0x",
        gasEstimate: BigInt(0),
        to: ZERO_ADDRESS,
        callData: "0x",
        value: BigInt(0),
        minAmountOut: TokenAmount.fromHumanAmount(nativeToken, "0"),
      }) as SwapBuildOutputExactIn,
  };
}

/**
 * Polls a pair for the optimal route and amount for a swap using Balancer SDK
 */
export const usePollBalancerSwap = (
  args: IUsePollSwapsArgs,
  options?: IUsePollSwapsOptions,
) => {
  const { tokenIn, tokenOut, amount, tokenInDecimals, tokenOutDecimals } = args;

  const publicClient = usePublicClient();
  const { account, config: beraConfig } = useBeraJs();
  const defaultSlippagePercent =
    (useSlippage()?.toString() as `${number}`) ?? ("1" as `${number}`);
  const defaultDeadlineIn = 30; // seconds

  const config = options?.beraConfigOverride ?? beraConfig;
  // FIXME: is this QUERY key acceptable?
  const QUERY_KEY =
    !publicClient ||
    !account ||
    !config ||
    !tokenIn ||
    !tokenOut ||
    !tokenInDecimals ||
    !tokenOutDecimals ||
    options?.isTyping
      ? null // Prevent fetching when required data is missing
      : [tokenIn, tokenOut, amount];

  return useSWR(
    QUERY_KEY,
    async () => {
      try {
        if (options?.isTyping) {
          return getEmptyResponse();
        }
        if (!publicClient || !account || !config) {
          throw new Error("Missing public client, account, or config");
        }
        const tokenInV3 = new Token(chainId, tokenIn, tokenInDecimals ?? 18);
        const tokenOutV3 = new Token(chainId, tokenOut, tokenOutDecimals ?? 6);
        const tokenAmount = TokenAmount.fromHumanAmount(tokenInV3, "1");
        const swapKind = SwapKind.GivenIn;

        // Fetch paths using Balancer API
        const sorPaths = await balancerApi.sorSwapPaths.fetchSorSwapPaths({
          chainId,
          tokenIn: tokenInV3.address,
          tokenOut: tokenOutV3.address,
          swapKind,
          swapAmount: tokenAmount,
        });

        if (!sorPaths) {
          throw new Error("No swap paths returned from Balancer API");
        }

        const swapInput = {
          chainId,
          paths: sorPaths,
          swapKind,
          userData: "0x" as `0x${string}`,
        };

        const swap = new Swap(swapInput);
        const queryOutput = await swap.query(publicClient.transport.url);

        if (queryOutput.swapKind !== SwapKind.GivenIn) {
          throw new Error("Swap kind is not GivenIn");
        }

        if (!queryOutput.expectedAmountOut) {
          throw new Error("No path amounts returned");
        }

        // NOTE: we are building this call here to set the deadline to 30 seconds from the time we return the object
        return {
          isLoading: false,
          swapPaths: sorPaths,
          ...queryOutput,
          expectedAmountOutFormatted: formatUnits(
            queryOutput.expectedAmountOut.amount,
            tokenInDecimals,
          ),
          amountInFormatted: formatUnits(
            queryOutput.amountIn.amount,
            tokenInDecimals,
          ),
          buildCall: (
            slippagePercent = defaultSlippagePercent,
            deadlineIn = defaultDeadlineIn,
          ) =>
            swap.buildCall({
              slippage: Slippage.fromPercentage(slippagePercent),
              deadline: BigInt(Math.round(Date.now() / 1000) + deadlineIn),
              queryOutput,
              sender: account,
              recipient: account,
              wethIsEth: true,
            }),
        };
      } catch (e: any) {
        // NOTE: we are throwing errors but logging them here because SWR doesnt handle errors well
        console.error(e);
        throw new Error(`Error fetching swap information. Error: ${e}`);
      }
    },
    {
      ...options?.opts,
    },
  );
};
