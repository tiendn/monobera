"use client";

import { notFound, useRouter } from "next/navigation";
import {
  truncateHash,
  useVaultAddress,
  useSelectedGauge,
  useSelectedGaugeValidators,
  type UserValidator,
  useRewardVaultIncentives,
  useMultipleTokenInformation,
} from "@bera/berajs";
import { lendRewardsAddress, blockExplorerUrl } from "@bera/config";
import { DataTable, GaugeIcon, MarketIcon, PoolHeader } from "@bera/shared-ui";
import { getHubValidatorPath } from "@bera/shared-ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@bera/ui/tabs";
import { SWRConfig } from "swr";
import { Address } from "viem";

import { gauge_incentives_columns } from "~/columns/gauge-incentives-columns";
import { getGaugeValidatorColumns } from "~/columns/general-validator-columns";
import Loading from "../loading";
import { BendRewardsBanner } from "./banner";
import { MyGaugeDetails } from "./my-gauge-details";

export const GaugeDetails = ({
  gaugeAddress,
}: {
  gaugeAddress: Address;
}) => {
  return (
    <SWRConfig value={{}}>
      <_GaugeDetails gaugeAddress={gaugeAddress} />
    </SWRConfig>
  );
};

const _GaugeDetails = ({ gaugeAddress }: { gaugeAddress: Address }) => {
  const {
    data: gauge,
    isLoading: isGaugeLoading,
    error: gaugeError,
    isValidating: isGaugeValidating,
  } = useSelectedGauge(gaugeAddress);

  const router = useRouter();

  const {
    data: rewardVault,
    isLoading: isRewardVaultLoading,
    error: rewardVaultError,
  } = useVaultAddress(gaugeAddress);

  const {
    data: validators = [],
    isLoading: isValidatorsLoading,
    isValidating: isValidatorsValidating,
  } = useSelectedGaugeValidators(gaugeAddress);

  const { data: incentivesData } = useRewardVaultIncentives({
    address: rewardVault?.address,
  });

  const { data: incentiveTokens } = useMultipleTokenInformation({
    addresses: incentivesData?.map((incentive) => incentive.token),
  });

  const activeIncentives = incentivesData?.map((incentive) => {
    const token = incentiveTokens?.find(
      (token) => token.address === incentive.token,
    ) ?? { address: incentive.token };
    return { ...incentive, token };
  });

  if (rewardVaultError) return notFound();

  console.log({ gauge });

  return (
    <>
      {rewardVault ? (
        <div className="flex flex-col gap-11">
          <PoolHeader
            title={
              <>
                <GaugeIcon
                  address={rewardVault?.address}
                  size="xl"
                  overrideImage={gauge?.metadata?.logoURI}
                />
                {gauge?.metadata?.name ?? truncateHash(gaugeAddress)}
              </>
            }
            subtitles={[
              {
                title: "Platform",
                content: (
                  <>
                    <MarketIcon
                      market={gauge?.metadata?.product ?? ""}
                      size={"md"}
                    />
                    {gauge?.metadata?.product ?? "OTHER"}
                  </>
                ),
                externalLink: gauge?.metadata?.url ?? "",
              },
              {
                title: "Reward Vault",
                content: <>{truncateHash(rewardVault?.address ?? "")}</>,
                externalLink: `${blockExplorerUrl}/address/${rewardVault?.address}`,
              },
              {
                title: "Staking Contract",
                content: <>{truncateHash(gauge?.stakingTokenAddress ?? "")}</>,
                externalLink: `${blockExplorerUrl}/address/${gauge?.stakingTokenAddress}`,
              },
            ]}
            className="border-b border-border pb-8"
          />
          {gaugeAddress.toLowerCase() !== lendRewardsAddress.toLowerCase() ? (
            <MyGaugeDetails gauge={gauge} rewardVault={rewardVault} />
          ) : (
            <BendRewardsBanner />
          )}

          <Tabs defaultValue="incentives" className="flex flex-col gap-4">
            <div className="flex flex-col justify-between gap-4 md:flex-row">
              <TabsList className="w-full md:w-fit">
                <TabsTrigger value="incentives" className="w-full md:w-fit">
                  Incentives
                </TabsTrigger>
                <TabsTrigger value="validators" className="w-full md:w-fit">
                  Validators
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="incentives">
              <DataTable
                loading={isGaugeLoading}
                validating={isGaugeValidating}
                columns={gauge_incentives_columns}
                data={activeIncentives ?? []}
                className="max-h-[300px] min-w-[1000px] shadow"
                onRowClick={(row: any) =>
                  router.push(
                    `/incentivize?gauge=${gaugeAddress}&token=${row.original.token.address}`,
                  )
                }
              />
            </TabsContent>
            <TabsContent value="validators">
              <DataTable
                columns={getGaugeValidatorColumns(rewardVault)}
                loading={isValidatorsLoading}
                validating={isValidatorsValidating}
                data={validators as UserValidator[]}
                className="min-w-[800px] shadow"
                onRowClick={(row: any) =>
                  window.open(getHubValidatorPath(row.original.id), "_blank")
                }
              />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Loading />
      )}
    </>
  );
};
