import React from "react";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { isIPFS } from "@bera/config";

import PoolPageContent, { PoolPageWrapper } from "./PoolPageContent";
import { balancerClient } from "~/b-sdk/balancerClient";
import { bexSubgraphClient } from "@bera/graphql";
import {
  GetSubgraphPool,
  GetSubgraphPoolQuery,
} from "@bera/graphql/dex/subgraph";

export function generateMetadata(): Metadata {
  return {
    title: "Pool",
  };
}

// THIS IS NOT COMPATIBLE WITH IPFS. CHECK THIS CAUSES BUGS
// export const dynamic = "force-dynamic";

export default async function PoolPage({
  params,
}: {
  params: { poolId: string };
}) {
  if (isIPFS) {
    return null;
  }

  try {
    // if (!isAddress(params.poolId)) {
    //   notFound();
    // }

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
        <PoolPageContent poolId={params.poolId} />
      </PoolPageWrapper>
    );
  } catch (e) {
    console.log(`Error fetching pools: ${e}`);
    notFound();
  }
}

export async function generateStaticParams() {
  if (isIPFS) {
    return [
      {
        poolId: "0x",
      },
    ];
  }
  const pools = await balancerClient.pools.all();
  return pools.map((pool) => ({
    poolId: pool.id,
  }));
}
