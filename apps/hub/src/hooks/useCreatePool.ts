import { ReactElement, useEffect, useMemo, useState } from "react";
import { PoolWithMethods, parseFixed } from "@balancer-labs/sdk";
import {
  ADDRESS_ZERO,
  TransactionActionType,
  balancerPoolCreationHelperAbi,
  useBeraJs,
  type Token,
} from "@bera/berajs";
import { balancerPoolCreationHelper } from "@bera/config";
import { useTxn } from "@bera/shared-ui";
import { PoolType } from "@berachain-foundation/berancer-sdk";
import { formatUnits, keccak256, parseUnits } from "viem";

import { usePools } from "~/b-sdk/usePools";
import { TokenInput } from "./useMultipleTokenInput";

interface UseCreatePoolProps {
  tokens: TokenInput[];
  weights: number[]; // NOTE: weights are an array of percentages summing to 100
  poolType: PoolType;
  swapFee: number;
  owner: string;
  poolSymbol: string;
  poolName: string;
  onSuccess?: (hash: string) => void;
  onError?: (e?: Error) => void;
}

interface UseCreatePoolReturn {
  generatedPoolName: string;
  generatedPoolSymbol: string;
  isDupePool: boolean;
  dupePool: PoolWithMethods | null;
  normalizedWeights: bigint[];
  formattedNormalizedWeights: string[];
  createPool: () => void;
  isLoadingPools: boolean;
  errorLoadingPools: boolean;
  ModalPortal: ReactElement<any, any>;
}

export const useCreatePool = ({
  tokens,
  weights,
  poolType,
  poolName,
  poolSymbol,
  swapFee,
  owner,
  onSuccess,
  onError,
}: UseCreatePoolProps): UseCreatePoolReturn => {
  const [isDupePool, setIsDupePool] = useState<boolean>(false);
  const [dupePool, setDupePool] = useState<PoolWithMethods | null>(null);

  // pull down the pools we have to check for duplicates
  const {
    data: pools,
    isLoading: isLoadingPools,
    error: errorLoadingPools,
  } = usePools();

  useEffect(() => {
    if (tokens.length === 0) return;
    if (isLoadingPools) return;

    const isDupe = pools?.find((pool) => {
      const hasAllTokens = tokens.every((token) =>
        pool?.tokenAddresses?.includes(token.address.toLowerCase()),
      );
      if (hasAllTokens && pool?.poolType.toString() === poolType.toString()) {
        // TODO: use subgraph to query similar pools vs doing this in JS
        setDupePool(pool);
        return true;
      }
      setDupePool(null);
      return false;
    });

    setIsDupePool(!!isDupe);
  }, [tokens, pools, isLoadingPools]);

  const { write, ModalPortal } = useTxn({
    message: "Creating new pool...",
    onSuccess,
    onError,
    actionType: TransactionActionType.CREATE_POOL,
  });

  // apply a correction for repeating weights like .3r and .7r by adding the difference to the smallest weight
  const { normalizedWeights, formattedNormalizedWeights } = useMemo(() => {
    if (weights.length === 0) {
      return { normalizedWeights: [], formattedNormalizedWeights: [] };
    }
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const normalizedWeights = weights.map((weight) =>
      parseUnits((weight / totalWeight).toString(), 18),
    );
    const weightSum = normalizedWeights.reduce(
      (sum, weight) => sum + weight,
      0n,
    );
    const oneIn18Decimals = parseUnits("1", 18);
    const correction = oneIn18Decimals - weightSum;

    if (correction !== 0n && normalizedWeights.length > 0) {
      const minWeightIndex = normalizedWeights.reduce(
        (minIndex, weight, index, array) =>
          weight < array[minIndex] ? index : minIndex,
        0,
      );
      if (normalizedWeights[minWeightIndex] !== undefined) {
        normalizedWeights[minWeightIndex] += correction;
      }
    }

    const formattedNormalizedWeights = normalizedWeights.map((weight) => {
      const percentage = formatUnits(weight, 18);
      return `${(parseFloat(percentage) * 100).toFixed(6)}%`;
    });

    return { normalizedWeights, formattedNormalizedWeights };
  }, [weights]);

  const generatePoolName = (tokens: Token[], poolType: PoolType): string => {
    if (tokens.length === 0) {
      return "";
    }
    return tokens.map((token) => token.symbol).join(" | ");
  };

  const generatePoolSymbol = (
    tokens: Token[],
    weights: bigint[],
    poolType: PoolType,
  ): string => {
    const poolTypeString = poolType.toString().toUpperCase();
    if (poolType === PoolType.Weighted) {
      if (weights.length === 0) {
        return "";
      }
      return `${tokens
        .map((token, index) => {
          const weight = weights[index];
          const weightPercentage = parseFloat(formatUnits(weight, 18)) * 100;
          return `${weightPercentage.toFixed(0)}${token.symbol}`;
        })
        .join("-")}-${poolTypeString}`;
    }
    return `${tokens.map((token) => token.symbol).join("-")}-${poolTypeString}`;
  };

  const [generatedPoolName, generatedPoolSymbol] = useMemo(() => {
    return [
      generatePoolName(tokens, poolType),
      generatePoolSymbol(tokens, normalizedWeights, poolType),
    ];
  }, [tokens, poolType, normalizedWeights]);

  const createPool = () => {
    // FIXME: we need better handling here
    if (!owner) return;
    if (poolName === "" || poolSymbol === "") return;

    const tokensAddresses = tokens.map((token) => token.address);
    const rateProviders = tokens.map(() => ADDRESS_ZERO);
    const swapFeePercentage = parseUnits(swapFee.toString(), 16);

    // TODO: the below 3 inputs will be connected as a part of stable pool create PR
    const tokenRateCacheDurations = tokens.map(() => BigInt(100));
    const exemptFromYieldProtocolFeeFlag = false;
    const amplificationParameter = BigInt(62);

    const amountsIn = tokens.map((token) =>
      parseUnits(token.amount || "0", token.decimals ?? 18),
    );
    const isStablePool =
      poolType === PoolType.ComposableStable ||
      poolType === PoolType.MetaStable;

    const sortedData = tokensAddresses
      .map((token, index) => ({
        token,
        amountIn: amountsIn[index],
        rateProvider: rateProviders[index],
        weight: normalizedWeights[index],
        cacheDuration: tokenRateCacheDurations[index],
      }))
      .sort((a, b) => (BigInt(a.token) < BigInt(b.token) ? -1 : 1));

    const sortedTokens = sortedData.map((item) => item.token);
    const sortedAmountsIn = sortedData.map((item) => item.amountIn);
    const sortedRateProviders = sortedData.map((item) => item.rateProvider);
    const sortedWeights = sortedData.map((item) => item.weight);
    const sortedCacheDurations = sortedData.map((item) => item.cacheDuration);

    const salt = keccak256(Buffer.from(`${poolName}-${owner}`));
    const args = isStablePool
      ? ([
          poolName,
          poolSymbol,
          sortedTokens,
          amplificationParameter,
          sortedRateProviders,
          sortedCacheDurations,
          exemptFromYieldProtocolFeeFlag,
          swapFeePercentage,
          sortedAmountsIn,
          owner,
          salt,
        ] as const)
      : ([
          poolName,
          poolSymbol,
          sortedTokens,
          sortedWeights,
          sortedRateProviders,
          swapFeePercentage,
          sortedAmountsIn,
          owner,
          salt,
        ] as const);

    const writeData = {
      abi: balancerPoolCreationHelperAbi,
      address: balancerPoolCreationHelper,
      functionName: isStablePool
        ? ("createAndJoinStablePool" as const)
        : ("createAndJoinWeightedPool" as const),
      params: args,
      owner,
      value: 0n,
      gasLimit: 7920027n, // NOTE: previous examples get up to 72% of this amount, which is the metamask maximum.
    };

    console.log("writeData", writeData);

    // @ts-ignore FIXME: need to return to this when we have stable, we should split up the writes for better type-safety.
    write(writeData);
  };

  return {
    ModalPortal,
    normalizedWeights,
    formattedNormalizedWeights,
    generatedPoolName,
    generatedPoolSymbol,
    isDupePool,
    dupePool,
    createPool,
    isLoadingPools,
    errorLoadingPools,
  };
};
