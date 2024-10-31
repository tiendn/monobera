import { bgtClient } from "@bera/graphql";
import {
  GetValidatorBlockStats,
  type GetValidatorBlockStatsQuery,
} from "@bera/graphql/pol";
import { Address } from "viem";

import { type BeraConfig } from "~/types";
import { formatDaysToTimestamps } from "~/utils";

export const getValidatorBlockStats = async ({
  config,
  address,
}: {
  config: BeraConfig;
  address: Address;
}): Promise<GetValidatorBlockStatsQuery | undefined> => {
  try {
    if (!config.subgraphs?.polSubgraph) {
      throw new Error("pol subgraph uri is not found in config");
    }

    const result = await bgtClient.query<GetValidatorBlockStatsQuery>({
      query: GetValidatorBlockStats,
      variables: {
        address: address.toLowerCase(),
      },
    });

    return result.data;
  } catch (e) {
    console.error("GetValidatorBlockRewardStats:", e);
    return undefined;
  }
};
