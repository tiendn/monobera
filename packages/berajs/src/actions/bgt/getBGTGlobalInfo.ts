import { bexApiGraphqlClient } from "@bera/graphql";
import {
  ApiValidatorFragment,
  ApiVaultFragment,
  GlobalData,
  GlobalDataQuery,
  GlobalDataQueryVariables,
} from "@bera/graphql/pol/api";
import type { BeraConfig, RewardVaultIncentive, Validator } from "~/types";

export interface GlobalInfo {
  bgtInfo: {
    bgtInflation: number;
    bgtPerBlock: number;
    blockCountPerYear: number;
    totalStakeBgt: number;
  };
  incentiveCount: number;
  sumAllIncentivesInHoney: string;
  top3Incentives: { activeIncentives: RewardVaultIncentive[] };
  top3Vaults: ApiVaultFragment[];
  top3EmittingValidators: ApiValidatorFragment[];
  validatorCount: number;
  vaultCount: number;
}

export const getBGTGlobalInfo = async (
  config: BeraConfig,
): Promise<GlobalInfo | undefined> => {
  if (!config.endpoints?.polEndpoint) {
    throw new Error("Missing backend endpoint in config");
  }
  const [res, apiRes] = await Promise.all([
    fetch(`${config.endpoints.polEndpoint}/homepage`),
    bexApiGraphqlClient.query<GlobalDataQuery, GlobalDataQueryVariables>({
      query: GlobalData,
    }),
  ]);

  const data = await res.json();
  const apiData = apiRes.data;

  return {
    bgtInfo: data.bgtInfo,
    sumAllIncentivesInHoney: data.sumAllIncentivesInHoney,
    validatorCount: data.validatorCount,
    vaultCount: data.vaultCount,
    incentiveCount: data.incentiveCount,
    top3Incentives: data.top3Incentives,
    ...apiData,
  } satisfies GlobalInfo;
};
