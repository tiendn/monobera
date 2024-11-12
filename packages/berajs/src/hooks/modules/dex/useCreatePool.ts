import { useMemo } from "react";
import { balancerPoolCreationHelper } from "@bera/config";
import { bexSubgraphClient } from "@bera/graphql";
import {
  GetDedupedSubgraphPools,
  GetDedupedSubgraphPoolsQuery,
  SubgraphPoolFragment,
} from "@bera/graphql/dex/subgraph";
import { PoolType } from "@berachain-foundation/berancer-sdk";
import useSWRImmutable from "swr/immutable";
import { keccak256, parseUnits } from "viem";

import { generatePoolName, generatePoolSymbol } from "~/utils/poolNamings";
import { balancerPoolCreationHelperAbi } from "~/abi";
import { ADDRESS_ZERO } from "~/config";
import { TokenWithAmount } from "~/types";

interface UseCreatePoolProps {
  tokens: TokenWithAmount[];
  normalizedWeights: bigint[]; // NOTE: if you pass weights that have off-by-1 errors pool create will fail (ex: 0.3 repeating)
  poolType: PoolType;
  swapFee: number;
  owner: string;
  poolSymbol: string;
  poolName: string;
  amplification: number;
}

interface UseCreatePoolReturn {
  generatedPoolName: string;
  generatedPoolSymbol: string;
  isDupePool: boolean;
  dupePool?: SubgraphPoolFragment | null;
  createPoolArgs: any;
  isLoadingPools: boolean;
  errorLoadingPools: boolean;
}

export const useCreatePool = ({
  tokens,
  normalizedWeights,
  poolType,
  poolName,
  poolSymbol,
  swapFee,
  owner,
  amplification,
}: UseCreatePoolProps): UseCreatePoolReturn => {
  const {
    data: dupePool,
    error: errorLoadingPools,
    isLoading: isLoadingPools,
  } = useSWRImmutable<SubgraphPoolFragment | null>(
    ["useCreatePool__deduped_pool", tokens, poolType],
    async () => {
      if (tokens.length === 0 || !poolType) {
        return null;
      }
      try {
        const tokensSorted = tokens
          .map((token) => token.address.toLowerCase())
          .sort((a, b) => a.localeCompare(b));

        const res = await bexSubgraphClient.query<GetDedupedSubgraphPoolsQuery>(
          {
            query: GetDedupedSubgraphPools,
            variables: {
              tokens: tokensSorted,
              type: poolType,
            },
          },
        );

        const matchingPools = res.data.pools.filter((pool) => {
          return pool.tokens?.every(
            (token) =>
              tokensSorted.includes(token.address) ||
              token.address === pool.address, // Composable pools have the LP token in the tokens list
          );
        });

        return matchingPools?.at(0) ?? null;
      } catch (error) {
        return null;
      }
    },
  );

  const [generatedPoolName, generatedPoolSymbol] = useMemo(() => {
    return [
      generatePoolName(tokens),
      generatePoolSymbol(tokens, normalizedWeights, poolType),
    ];
  }, [tokens, poolType, normalizedWeights]);

  const sharedCalculations = useMemo(() => {
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
      .sort((a, b) => (a.token.toLowerCase() < b.token.toLowerCase() ? -1 : 1));

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
  const exemptFromYieldProtocolFeeFlag = false; // FIXME: should this ever be true?

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
            BigInt(amplification),
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
      gasLimit: 7920027n, // NOTE: this is metamask max, which we use for an upper limit in simulation because this is an expensive tx
    };
  }, [
    owner,
    poolName,
    poolSymbol,
    isStablePool,
    sharedCalculations,
    amplification,
  ]);

  return {
    generatedPoolName,
    generatedPoolSymbol,
    isDupePool: !!dupePool,
    dupePool,
    createPoolArgs,
    isLoadingPools,
    errorLoadingPools,
  };
};
