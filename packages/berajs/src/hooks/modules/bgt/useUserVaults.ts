import { balancerApiChainName, multicallAddress } from "@bera/config";
import { bexApiGraphqlClient } from "@bera/graphql";
import {
  GetUserVaults,
  ApiVaultFragment,
  GetUserVaultsQuery,
  GetUserVaultsQueryVariables,
  GqlChain,
} from "@bera/graphql/pol/api";
import useSWR from "swr";
import { Address, formatUnits } from "viem";
import { usePublicClient } from "wagmi";

import { BERA_VAULT_REWARDS_ABI } from "~/abi";
import { useBeraJs } from "~/contexts";
import POLLING from "~/enum/polling";
import { DefaultHookOptions, DefaultHookReturnType } from "~/types/global";

interface Call {
  abi: any;
  address: Address;
  functionName: string;
  args: any[];
}

/**
 *
 * @returns the current honey price of a given token
 */

export interface UserVault {
  unclaimedBgt: string;
  balance: string;
  vault: ApiVaultFragment;
}

export const useUserVaults = (
  options?: DefaultHookOptions,
): DefaultHookReturnType<
  | {
      totalBgtRewards: string;
      vaults: UserVault[];
    }
  | undefined
> => {
  const { account } = useBeraJs();
  const publicClient = usePublicClient();
  const QUERY_KEY = account ? ["useUserVaults", account] : null;
  const swrResponse = useSWR<
    | {
        totalBgtRewards: string;
        vaults: UserVault[];
      }
    | undefined
  >(
    QUERY_KEY,
    async () => {
      if (!account || !publicClient) return undefined;

      const res = await bexApiGraphqlClient.query<
        GetUserVaultsQuery,
        GetUserVaultsQueryVariables
      >({
        query: GetUserVaults,
        variables: {
          userId: account,
          chain: balancerApiChainName as GqlChain,
        },
      });

      const deposits = res.data?.userVaultDeposits?.deposits;

      const calls: Call[] = deposits.map((deposit) => ({
        address: deposit.vaultAddress as Address,
        abi: BERA_VAULT_REWARDS_ABI,
        functionName: "earned",
        args: [account],
      }));

      const balanceCalls: Call[] = deposits.map((deposit) => ({
        address: deposit.vaultAddress as Address,
        abi: BERA_VAULT_REWARDS_ABI,
        functionName: "balanceOf",
        args: [account],
      }));

      const [result, balanceResult] = await Promise.all([
        publicClient.multicall({
          contracts: calls,
          multicallAddress: multicallAddress,
        }),
        publicClient.multicall({
          contracts: balanceCalls,
          multicallAddress: multicallAddress,
        }),
      ]);

      let total = 0n;
      const userVaults = deposits.map((deposit, index: number) => {
        const item = result[index];
        const balanceItem = balanceResult[index];
        total += item.result as bigint;

        if (item.status === "success") {
          return {
            ...deposit,
            unclaimedBgt: formatUnits(item.result as bigint, 18),
            balance: formatUnits(balanceItem.result as bigint, 18),
          };
        }
        return {
          ...deposit,
          unclaimedBgt: "0",
          balance: "0",
        };
      });

      const sortedUserVaults = userVaults.sort((a: any, b: any) => {
        const aUnclaimed = parseFloat(a.unclaimedBgt);
        const bUnclaimed = parseFloat(b.unclaimedBgt);
        return aUnclaimed - bUnclaimed;
      });

      return {
        totalBgtRewards: formatUnits(total, 18),
        vaults: sortedUserVaults as UserVault[],
      };
    },
    {
      ...options,
      refreshInterval: options?.opts?.refreshInterval ?? POLLING.NORMAL,
      keepPreviousData: true,
    },
  );
  return {
    ...swrResponse,
    refresh: () => swrResponse?.mutate?.(),
  };
};
