import { useMultipleTokenInformation, useTokenInformation } from "@bera/berajs";
import { balancerVaultAddress } from "@bera/config";
import { GqlPoolType, MinimalPoolFragment } from "@bera/graphql/dex/api";
import { SubgraphPoolFragment } from "@bera/graphql/dex/subgraph";
import {
  composabableStablePoolV5Abi_V2,
  vaultV2Abi,
  weightedPoolV4Abi_V2,
} from "@berachain-foundation/berancer-sdk";
import useSWRImmutable from "swr/immutable";
import { Address, erc20Abi, formatEther, formatUnits, isAddress } from "viem";
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

      const [name, poolTokens, totalSupply, swapFee, _version, decimals] =
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
            abi: composabableStablePoolV5Abi_V2,
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
          publicClient.readContract({
            address,
            abi: weightedPoolV4Abi_V2,
            functionName: "decimals",
          }),
        ]);

      const version = JSON.parse(_version);

      let virtualSupply;

      if (version.name === "ComposableStablePool") {
        // This returns the actual supply excluding preminted BPTs
        virtualSupply = await publicClient.readContract({
          address,
          abi: [
            {
              type: "function",
              name: "getActualSupply",
              stateMutability: "view",
              inputs: [],
              outputs: [
                {
                  type: "uint256",
                },
              ],
            },
          ],
          functionName: "getActualSupply",
        });
      }

      return {
        name,
        poolTokens,
        totalSupply: virtualSupply ?? totalSupply,
        swapFee,
        decimals,
        version,
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
    totalShares: formatUnits(poolData.totalSupply, poolData.decimals),
    totalLiquidity: undefined,
    swapFee: formatEther(poolData.swapFee),
    createTime: 0,
    name: poolData.name,
    tokens: tokenInformation.map((token, idx) => ({
      address: token.address,
      name: token.name,
      decimals: token.decimals,
      symbol: token.symbol,
      balance: formatUnits(poolData.poolTokens[1][idx], token.decimals),
      token: { __typename: "Token", token },
    })),
  };

  return {
    data: pool,
  };
}
