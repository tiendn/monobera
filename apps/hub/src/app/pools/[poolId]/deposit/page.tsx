import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { dexName } from "@bera/config";
import { Address } from "viem";

import AddLiquidityContent from "./AddLiquidityContent";
import { balancerClient } from "~/b-sdk/balancerClient";
import { bexSubgraphClient } from "@bera/graphql";
import {
  GetSubgraphPool,
  GetSubgraphPoolQuery,
} from "@bera/graphql/dex/subgraph";

export function generateMetadata(): Metadata {
  return {
    title: "Add Liquidity",
    description: `Add liquidity to ${dexName}`,
  };
}

export const revalidate = 30;
export default async function PoolPage({
  params,
}: {
  params: { poolId: string };
}) {
  try {
    const res = await bexSubgraphClient.query<GetSubgraphPoolQuery>({
      query: GetSubgraphPool,
      variables: {
        poolId: params.poolId,
      },
    });

    if (!res.data.pool) {
      notFound();
    }

    return <AddLiquidityContent poolId={params.poolId as Address} />;
  } catch (e) {
    console.log(`Error fetching pools: ${e}`);
    notFound();
  }
}

export { generateStaticParams } from "../details/page";
