import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { dexName, isIPFS } from "@bera/config";

import WithdrawPageContent from "../../[poolId]/withdraw/WithdrawPageContent";
import { balancerApi } from "~/b-sdk/b-sdk";

export { generateStaticParams } from "../details/page";

export function generateMetadata(): Metadata {
  return {
    title: "Withdraw Liquidity",
    description: `Withdraw your liquidity from ${dexName}`,
  };
}

export const fetchCache = "force-no-store";

export default async function Withdraw({
  params,
}: {
  params: { poolId: string };
}) {
  if (isIPFS) {
    return null;
  }

  const pool = await balancerApi.pools.fetchPoolState(params.poolId);

  if (!pool) {
    notFound();
  }

  try {
    return <WithdrawPageContent poolId={params.poolId!} />;
  } catch (e) {
    console.log(`Error fetching pools: ${e}`);
    notFound();
  }
}
