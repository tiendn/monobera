import { useMultipleTokenInformation, useTokenInformation } from "@bera/berajs";
import { balancerVaultAddress } from "@bera/config";
import { GqlPoolType, MinimalPoolFragment } from "@bera/graphql/dex/api";
import { SubgraphPoolFragment } from "@bera/graphql/dex/subgraph";
import {
  vaultV2Abi,
  weightedPoolV4Abi_V2,
} from "@berachain-foundation/berancer-sdk";
import useSWRImmutable from "swr/immutable";
import { Address, erc20Abi, formatEther, isAddress } from "viem";
import { usePublicClient } from "wagmi";

export function useOnChainPoolData(poolId: string) {
  const address = poolId.slice(0, 42) as Address;
  const publicClient = usePublicClient();

  const isAddressValid = isAddress(address);

  const isValid = isAddressValid && !!publicClient;

  const { data: poolData } = useSWRImmutable(
    isValid ? ["useOnChainPoolData", "tokenAddresses", poolId] : null,
    async () => {
      if (!publicClient) return undefined;

      const [name, poolTokens, totalShares, swapFee, version] =
        await Promise.all([
          publicClient.readContract({
            address,
            abi: erc20Abi,
            functionName: "name",
          }),
          publicClient.readContract({
            address: balancerVaultAddress,
            abi: vaultV2Abi,
            functionName: "getPoolTokens",
            args: [poolId as `0x${string}`],
          }),
          publicClient.readContract({
            address,
            abi: erc20Abi,
            functionName: "totalSupply",
          }),
          publicClient.readContract({
            address,
            abi: weightedPoolV4Abi_V2,
            functionName: "getSwapFeePercentage",
          }),
          publicClient.readContract({
            address,
            abi: weightedPoolV4Abi_V2,
            functionName: "version",
          }),
        ]);

      return {
        name,
        poolTokens,
        totalShares,
        swapFee,
        version: JSON.parse(version),
      };
    },
  );

  const { data: tokenInformation, error } = useMultipleTokenInformation({
    addresses: poolData?.poolTokens[0] ?? [],
  });

  if (!poolData || !tokenInformation) return { data: undefined };

  const pool: SubgraphPoolFragment | undefined = {
    address,
    id: poolId,
    type:
      poolData.version.name === "ComposableStablePool"
        ? GqlPoolType.Stable
        : GqlPoolType.Weighted,
    totalShares: poolData.totalShares.toString(),
    totalLiquidity: undefined,
    swapFee: formatEther(poolData.swapFee),
    createTime: 0,
    name: poolData.name,
    tokens: tokenInformation.map((token, idx) => ({
      address: token.address,
      name: token.name,
      decimals: token.decimals,
      symbol: token.symbol,
      balance: poolData.poolTokens[0][idx],
      token: { __typename: "Token", token },
    })),
  };

  return {
    data: pool,
  };
}
