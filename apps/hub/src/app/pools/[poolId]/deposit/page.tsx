import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { dexName } from "@bera/config";
import { Address, isAddress } from "viem";

import AddLiquidityContent from "./AddLiquidityContent";
import { balancerClient } from "~/b-sdk/balancerClient";

export function generateMetadata(): Metadata {
  return {
    title: "Add Liquidity",
    description: `Add liquidity to ${dexName}`,
  };
}

export const fetchCache = "force-no-store";

export default async function PoolPage({
  params,
}: {
  params: { poolId: string };
}) {
  try {
    // if (!isAddress(params.poolId)) {
    //   notFound();
    // }
    const pool = await balancerClient.pools.find(params.poolId);
    if (!pool) {
      notFound();
    }

    return <AddLiquidityContent poolId={params.poolId as Address} />;
  } catch (e) {
    console.log(`Error fetching pools: ${e}`);
    notFound();
  }
}

export { generateStaticParams } from "../details/page";
