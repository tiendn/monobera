import React from "react";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { isIPFS } from "@bera/config";
import { Address, isAddress } from "viem";

import PoolPageContent from "./PoolPageContent";
import { balancerApi } from "~/b-sdk/b-sdk";
import { balancerClient } from "~/b-sdk/balancerClient";

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

    return <PoolPageContent poolId={params.poolId} />;
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
