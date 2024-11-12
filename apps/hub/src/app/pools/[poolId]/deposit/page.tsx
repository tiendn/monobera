import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { dexName } from "@bera/config";
import { Address } from "viem";

import AddLiquidityContent from "./AddLiquidityContent";
import { bexSubgraphClient } from "@bera/graphql";
import {
  GetSubgraphPool,
  GetSubgraphPoolQuery,
} from "@bera/graphql/dex/subgraph";
import { PoolPageWrapper } from "../details/PoolPageContent";

export function generateMetadata(): Metadata {
  return {
    title: "Add Liquidity",
    description: `Add liquidity to ${dexName}`,
  };
}

export const revalidate = 600;

export default async function PoolPage({
  params,
}: {
  params: { poolId: string };
}) {
  try {
    const res = await bexSubgraphClient.query<GetSubgraphPoolQuery>({
      query: GetSubgraphPool,
      variables: {
        id: params.poolId,
      },
    });

    if (!res.data.pool) {
      notFound();
    }

    return (
      <PoolPageWrapper pool={res.data.pool}>
        <AddLiquidityContent poolId={params.poolId as Address} />
      </PoolPageWrapper>
    );
  } catch (e) {
    console.log(`Error fetching pools: ${e}`);
    notFound();
  }
}

export { generateStaticParams } from "../details/page";
