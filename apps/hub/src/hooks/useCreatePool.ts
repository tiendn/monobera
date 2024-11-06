import { useEffect, useMemo, useState } from "react";
import { PoolWithMethods } from "@balancer-labs/sdk";
import {
  ADDRESS_ZERO,
  balancerPoolCreationHelperAbi,
  type Token,
} from "@bera/berajs";
import { balancerPoolCreationHelper } from "@bera/config";
import { PoolType } from "@berachain-foundation/berancer-sdk";
import { formatUnits, keccak256, parseUnits } from "viem";

import { usePools } from "~/b-sdk/usePools";
import { TokenInput } from "./useMultipleTokenInput";

interface UseCreatePoolProps {
  tokens: TokenInput[];
  weights: number[];
  poolType: PoolType;
  swapFee: number;
  owner: string;
  poolSymbol: string;
  poolName: string;
}

interface UseCreatePoolReturn {
  generatedPoolName: string;
  generatedPoolSymbol: string;
  isDupePool: boolean;
  dupePool: PoolWithMethods | null;
  normalizedWeights: bigint[];
  formattedNormalizedWeights: string[];
  createPoolArgs: any;
  isLoadingPools: boolean;
  errorLoadingPools: boolean;
}

export const useCreatePool = ({
  tokens,
  weights,
  poolType,
  poolName,
  poolSymbol,
  swapFee,
  owner,
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
    if (tokens.length === 0 || isLoadingPools) return;

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

  const sharedCalculations = useMemo(() => {
    // FIXME: we need a preview page for all of this information
    // Shared data preparation for both pool types
    const tokensAddresses = tokens.map((token) => token.address);
    const rateProviders = tokens.map(() => ADDRESS_ZERO);
    const swapFeePercentage = parseUnits(swapFee.toString(), 16);
    const amountsIn = tokens.map((token) =>
      parseUnits(token.amount || "0", token.decimals ?? 18),
    );

    const sortedData = tokensAddresses
      .map((token, index) => ({
        token,
        amountIn: amountsIn[index],
        rateProvider: rateProviders[index],
        weight: normalizedWeights[index],
        cacheDuration: BigInt(100), // Only used in stable pools
      }))
      .sort((a, b) =>
        a.token.toLowerCase().localeCompare(b.token.toLowerCase()),
      );

    return {
      sortedTokens: sortedData.map((item) => item.token),
      sortedAmountsIn: sortedData.map((item) => item.amountIn),
      sortedRateProviders: sortedData.map((item) => item.rateProvider),
      sortedWeights: sortedData.map((item) => item.weight),
      sortedCacheDurations: sortedData.map((item) => item.cacheDuration),
      swapFeePercentage,
      salt: keccak256(Buffer.from(`${poolName}-${owner}`)),
    };
  }, [tokens, normalizedWeights, swapFee, poolName, owner]);

  const isStablePool =
    poolType === PoolType.ComposableStable || poolType === PoolType.MetaStable;
  const exemptFromYieldProtocolFeeFlag = false;
  const amplificationParameter = BigInt(62);

  const createPoolArgs = useMemo(() => {
    if (!owner || poolName === "" || poolSymbol === "") return null;

    const {
      sortedTokens,
      sortedAmountsIn,
      sortedRateProviders,
      sortedWeights,
      sortedCacheDurations,
      swapFeePercentage,
      salt,
    } = sharedCalculations;

    return {
      abi: balancerPoolCreationHelperAbi,
      address: balancerPoolCreationHelper,
      functionName: isStablePool
        ? "createAndJoinStablePool"
        : "createAndJoinWeightedPool",
      params: isStablePool
        ? [
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
          ]
        : [
            poolName,
            poolSymbol,
            sortedTokens,
            sortedWeights,
            sortedRateProviders,
            swapFeePercentage,
            sortedAmountsIn,
            owner,
            salt,
          ],
      value: 0n,
      gasLimit: 7920027n, // NOTE: this is metamask mask, which we use for an upper limit in simulation because this is an expensive tx
    };
  }, [owner, poolName, poolSymbol, isStablePool, sharedCalculations]);

  return {
    generatedPoolName,
    generatedPoolSymbol,
    isDupePool,
    dupePool,
    normalizedWeights,
    formattedNormalizedWeights,
    createPoolArgs,
    isLoadingPools,
    errorLoadingPools,
  };
};
