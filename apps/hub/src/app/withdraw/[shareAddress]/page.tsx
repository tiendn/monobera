import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { dexName, isIPFS } from "@bera/config";
import { getMetaTitle } from "@bera/shared-ui";
import { isAddress } from "viem";

import WithdrawPageContent from "../WithdrawPageContent";

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
  params: { shareAddress: string };
}) {
  if (isIPFS) {
    return null;
  }

  try {
    return <WithdrawPageContent poolId={params.shareAddress!} />;
  } catch (e) {
    console.log(`Error fetching pools: ${e}`);
    notFound();
  }
}

export function generateStaticParams() {
  return [
    {
      shareAddress: "0x",
    },
  ];
}
