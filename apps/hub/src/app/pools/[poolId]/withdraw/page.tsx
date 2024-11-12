import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { dexName, isIPFS } from "@bera/config";

import WithdrawPageContent from "../../[poolId]/withdraw/WithdrawPageContent";
import { balancerApi } from "~/b-sdk/b-sdk";
import { PoolPageWrapper } from "../details/PoolPageContent";
import { bexSubgraphClient } from "@bera/graphql";
import {
  GetSubgraphPool,
  GetSubgraphPoolQuery,
} from "@bera/graphql/dex/subgraph";

export { generateStaticParams } from "../details/page";

export function generateMetadata(): Metadata {
  return {
    title: "Withdraw Liquidity",
    description: `Withdraw your liquidity from ${dexName}`,
  };
}

export const revalidate = 600;

export default async function Withdraw({
  params,
}: {
  params: { poolId: string };
}) {
  try {
    if (isIPFS) {
      return null;
    }
    const res = await bexSubgraphClient.query<GetSubgraphPoolQuery>({
      query: GetSubgraphPool,
      variables: {
        id: params.poolId,
      },
    });

    if (!res.data?.pool) {
      notFound();
    }

    return (
      <PoolPageWrapper pool={res.data.pool}>
        <WithdrawPageContent poolId={params.poolId!} />
      </PoolPageWrapper>
    );
  } catch (e) {
    console.log(`Error fetching pools: ${e}`);
    notFound();
  }
}
