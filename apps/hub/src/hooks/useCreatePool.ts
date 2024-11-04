import { useEffect, useMemo, useState } from "react";
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
import { keccak256, parseUnits } from "viem";

import { usePools } from "~/b-sdk/usePools";

interface UseCreatePoolProps {
  tokens: TokenInput[];
  weights: number[]; // NOTE: weights are an array of percentages summing to 100
  poolType: PoolType;
  onSuccess?: (hash: string) => void;
  onError?: (e?: Error) => void;
}

interface UseCreatePoolReturn {
  poolName: string;
  poolSymbol: string;
  isDupePool: boolean;
  dupePool: PoolWithMethods | null;
  errorMessage: string | null;
  createPool: () => void;
  isLoadingPools: boolean;
  errorLoadingPools: boolean;
}

interface TokenInput extends Token {
  amount: string;
  exceeding: boolean;
}

export const useCreatePool = ({
  tokens,
  weights,
  poolType,
  onSuccess,
  onError,
}: UseCreatePoolProps): UseCreatePoolReturn => {
  const { account } = useBeraJs();
  const [isDupePool, setIsDupePool] = useState<boolean>(false);
  const [dupePool, setDupePool] = useState<PoolWithMethods | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generatePoolName = (tokens: Token[], poolType: PoolType): string => {
    const tokenSymbols = tokens.map((token) => token.symbol).join(" | ");
    return `${tokenSymbols} ${poolType}`;
  };

  const generatePoolSymbol = (tokens: Token[], poolType: PoolType): string => {
    const tokenSymbols = tokens.map((token) => token.symbol).join("-");
    return `${tokenSymbols}-${poolType.toUpperCase()}`;
  };

  const [poolName, poolSymbol] = useMemo(() => {
    return [
      generatePoolName(tokens, poolType),
      generatePoolSymbol(tokens, poolType),
    ];
  }, [tokens, poolType]);

  // pull down the pools we have to check for duplicates
  const {
    data: pools,
    isLoading: isLoadingPools,
    error: errorLoadingPools,
  } = usePools(); // FIXME we should use v3 of this for better typing

  useEffect(() => {
    if (tokens.length === 0) return;
    if (isLoadingPools) return;

    const isDupe = pools?.find((pool) => {
      const hasAllTokens = tokens.every((token) =>
        pool?.tokenAddresses?.includes(token.address.toLowerCase()),
      );
      if (hasAllTokens && pool?.poolType.toString() === poolType.toString()) {
        setDupePool(pool);
        return true;
      }
      setDupePool(null);
      return false;
    });

    setIsDupePool(!!isDupe);
  }, [tokens, pools, isLoadingPools]);

  const { write } = useTxn({
    message: "Creating new pool...",
    onSuccess,
    onError,
    actionType: TransactionActionType.CREATE_POOL,
  });

  const normalizedWeights = useMemo(() => {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const fixedWeights = weights.map((weight) =>
      BigInt(parseFixed((weight / totalWeight).toFixed(18), 18).toString()),
    );

    const weightSum = fixedWeights.reduce(
      (sum, weight) => sum + weight,
      BigInt(0),
    );
    const correction = BigInt(parseFixed("1", 18).toString()) - weightSum;

    if (correction !== BigInt(0)) {
      // Find the index of the smallest weight and do +1 there
      const minWeightIndex = fixedWeights.reduce(
        (minIndex, weight, index, array) =>
          weight < array[minIndex] ? index : minIndex,
        0,
      );
      fixedWeights[minWeightIndex] += correction;
    }

    return fixedWeights;
  }, [weights]);

  const createPool = () => {
    if (!account) return;

    const tokensAddresses = tokens.map((token) => token.address);
    const rateProviders = tokens.map(() => ADDRESS_ZERO);
    const swapFeePercentage = BigInt(parseFixed("0.01", 16).toString());
    const tokenRateCacheDurations = tokens.map(() => BigInt(100));
    const exemptFromYieldProtocolFeeFlag = tokens.map(() => false);
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
        feeFlag: exemptFromYieldProtocolFeeFlag[index],
      }))
      .sort((a, b) => (BigInt(a.token) < BigInt(b.token) ? -1 : 1));

    const sortedTokens = sortedData.map((item) => item.token);
    const sortedAmountsIn = sortedData.map((item) => item.amountIn);
    const sortedRateProviders = sortedData.map((item) => item.rateProvider);
    const sortedWeights = sortedData.map((item) => item.weight);
    const sortedCacheDurations = sortedData.map((item) => item.cacheDuration);
    const sortedFeeFlags = sortedData.map((item) => item.feeFlag);

    const salt = keccak256(Buffer.from(`${poolName}-${account}`));
    const args = isStablePool
      ? [
          poolName,
          poolSymbol,
          sortedTokens,
          amplificationParameter,
          sortedRateProviders,
          sortedCacheDurations,
          sortedFeeFlags,
          swapFeePercentage,
          sortedAmountsIn,
          account,
          salt,
        ]
      : [
          poolName,
          poolSymbol,
          sortedTokens,
          sortedWeights,
          sortedRateProviders,
          swapFeePercentage,
          sortedAmountsIn,
          account,
          salt,
        ];

    const writeData = {
      abi: balancerPoolCreationHelperAbi,
      address: balancerPoolCreationHelper,
      functionName: isStablePool
        ? "createAndJoinStablePool"
        : "createAndJoinWeightedPool",
      params: args,
      account,
      value: 0n,
      gasLimit: 7920027n,
    };

    write(writeData);
  };

  return {
    poolName,
    poolSymbol,
    isDupePool,
    dupePool,
    errorMessage,
    createPool,
    isLoadingPools,
    errorLoadingPools,
  };
};
