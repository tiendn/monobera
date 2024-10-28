import { PoolState } from "@balancer/sdk";
import useSWR from "swr";
import { useAccount, usePublicClient } from "wagmi";

import POLLING from "~/enum/polling";
import { DefaultHookOptions, DefaultHookReturnType } from "~/types/global";
import { PoolV2, useBeraJs, type IUserPosition } from "../../..";

type IUsePoolUserPositionArgs = {
  pool: PoolState | undefined;
};

/**
 * Given a pool and used within an initialized viem context, returns the user's position
 */
export const usePoolUserPosition = (
  { pool }: IUsePoolUserPositionArgs,
  options?: DefaultHookOptions,
): DefaultHookReturnType<IUserPosition | undefined> => {
  const { address: account } = useAccount();
  const publicClient = usePublicClient();
  const { config: beraConfig } = useBeraJs();
  const config = options?.beraConfigOverride ?? beraConfig;
  const QUERY_KEY = ["usePoolUserPosition", account, pool?.id];
  const swrResponse = useSWR<IUserPosition | undefined, any, typeof QUERY_KEY>(
    QUERY_KEY,
    async () => {
      if (!account || !publicClient || !pool) return;
      return undefined;
    },
    {
      ...options?.opts,
      refreshInterval: options?.opts?.refreshInterval ?? POLLING.FAST,
    },
  );

  return { ...swrResponse, refresh: () => swrResponse?.mutate?.() };
};
