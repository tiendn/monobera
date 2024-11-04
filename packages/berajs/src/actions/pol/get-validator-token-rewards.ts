import { bgtClient } from "@bera/graphql";
import {
  GetValidatorTokenRewardUsages,
  type GetValidatorTokenRewardUsagesQuery,
} from "@bera/graphql/pol";
import { Address } from "viem";

import { type BeraConfig } from "~/types";
import { formatDaysToTimestamps } from "~/utils";

export const getValidatorTokenRewardUsages = async ({
  config,
  address,
  daysRange,
}: {
  config: BeraConfig;
  address: Address;
  daysRange: number;
}): Promise<GetValidatorTokenRewardUsagesQuery | undefined> => {
  try {
    if (!config.subgraphs?.polSubgraph) {
      throw new Error("pol subgraph uri is not found in config");
    }

    const result = await bgtClient.query<GetValidatorTokenRewardUsagesQuery>({
      query: GetValidatorTokenRewardUsages,
      variables: {
        address: address.toLowerCase(),
        timestamp: formatDaysToTimestamps(daysRange),
      },
    });

    return result.data;
  } catch (e) {
    console.error("getValidatorTokenRewardUsagesQuery:", e);
    return undefined;
  }
};
