import useSWR, { mutate } from "swr";
import { Address } from "viem";

import { getValidValidator } from "~/actions/pol";
import { useBeraJs } from "~/contexts";
import { DefaultHookOptions, DefaultHookReturnType } from "~/types";

export const useValidValidator = (
  address: Address,
  options?: DefaultHookOptions,
): DefaultHookReturnType<boolean | undefined> => {
  const { config: beraConfig } = useBeraJs();
  const config = options?.beraConfigOverride ?? beraConfig;
  const QUERY_KEY = ["useSelectedValidatorSubgraph", address];

  const swrResponse = useSWR<boolean | undefined>(
    QUERY_KEY,
    async () => {
      if (!address) {
        throw new Error("useValidValidator needs a valid validator address");
      }
      return await getValidValidator({ config, address: address });
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
