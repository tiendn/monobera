import { type GetValidatorTokenRewardUsagesQuery } from "@bera/graphql/pol";
import { mutate } from "swr";
import useSWRImmutable from "swr/immutable";
import { Address } from "viem";

import { getValidatorTokenRewardUsages } from "~/actions/pol";
import { useBeraJs } from "~/contexts";
import { DefaultHookOptions, DefaultHookReturnType } from "~/types";

export const usePollValidatorTokenRewards = (
  address: Address,
  daysRange: number,
  options?: DefaultHookOptions,
): DefaultHookReturnType<GetValidatorTokenRewardUsagesQuery | undefined> => {
  const { config: beraConfig } = useBeraJs();
  const config = options?.beraConfigOverride ?? beraConfig;
  const QUERY_KEY = [
    "usePollValidatorTokenRewardsSubgraph",
    address,
    daysRange,
  ];
  const swrResponse = useSWRImmutable<
    GetValidatorTokenRewardUsagesQuery | undefined
  >(
    QUERY_KEY,
    async () => {
      if (!address) {
        throw new Error(
          "usePollValidatorBgtStaked needs a valid validator address",
        );
      }

      return await getValidatorTokenRewardUsages({
        config,
        address,
        daysRange,
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
