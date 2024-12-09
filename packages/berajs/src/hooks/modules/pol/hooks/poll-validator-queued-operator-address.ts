import useSWR, { mutate } from "swr";
import { Address } from "viem";
import { usePublicClient } from "wagmi";

import {
  ValidatorQueuedOperatorAddress,
  getValidatorQueuedOperatorAddress,
} from "~/actions/pol";
import { useBeraJs } from "~/contexts";
import { DefaultHookOptions, DefaultHookReturnType } from "~/types";

export const usePollValidatorQueuedOperatorAddress = (
  pubKey: Address,
  options?: DefaultHookOptions,
): DefaultHookReturnType<ValidatorQueuedOperatorAddress | undefined> => {
  const { config: beraConfig } = useBeraJs();
  const publicClient = usePublicClient();
  const config = options?.beraConfigOverride ?? beraConfig;
  const QUERY_KEY = ["usePollValidatorQueuedOperatorAddress", pubKey];

  const swrResponse = useSWR<ValidatorQueuedOperatorAddress | undefined>(
    QUERY_KEY,
    async () => {
      if (!publicClient) throw new Error("publicClient is not defined");
      if (!config) throw new Error("missing beraConfig");
      if (!pubKey) {
        throw new Error(
          "usePollValidatorQueuedOperatorAddress needs a valid validator public key",
        );
      }
      return await getValidatorQueuedOperatorAddress({
        config,
        client: publicClient,
        pubKey: pubKey,
      });
    },
    {
      ...options?.opts,
    },
  );

  return {
    ...swrResponse,
    refresh: () => mutate(QUERY_KEY),
  };
};
