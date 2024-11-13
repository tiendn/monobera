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
import { IContractWrite } from "~/hooks/useContractWrite";
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
    // TODO (#): add support for rate providers
    const tokensAddresses = tokens.map((token) => token.address);
    const rateProviders = tokens.map(() => ADDRESS_ZERO as `0x${string}`);
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
        cacheDuration: BigInt(100),
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
  const exemptFromYieldProtocolFeeFlag = false; // NOTE: this should be false for stable pools if rate providers are 0x0

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

    const value = 0n;
    const gasLimit = 7920027n; // NOTE: this is metamask max, which we use for an upper limit in simulation because this is an expensive tx

    if (isStablePool) {
      return {
        address: balancerPoolCreationHelper,
        abi: balancerPoolCreationHelperAbi,
        functionName: "createAndJoinStablePool",
        params: [
          poolName,
          poolSymbol,
          sortedTokens,
          BigInt(amplification),
          sortedRateProviders,
          sortedCacheDurations,
          exemptFromYieldProtocolFeeFlag,
          swapFeePercentage,
          sortedAmountsIn,
          owner as `0x${string}`,
          salt,
        ],
        value,
        gasLimit,
      } as IContractWrite<
        typeof balancerPoolCreationHelperAbi,
        "createAndJoinStablePool"
      >;
    }
    return {
      address: balancerPoolCreationHelper,
      abi: balancerPoolCreationHelperAbi,
      functionName: "createAndJoinWeightedPool",
      params: [
        poolName,
        poolSymbol,
        sortedTokens,
        sortedWeights,
        sortedRateProviders,
        swapFeePercentage,
        sortedAmountsIn,
        owner as `0x${string}`,
        salt,
      ],
      value,
      gasLimit,
    } as IContractWrite<
      typeof balancerPoolCreationHelperAbi,
      "createAndJoinWeightedPool"
    >;
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
