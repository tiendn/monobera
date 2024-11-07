import { type Metadata } from "next";

import PoolPageHeader from "./PoolPageHeader";
import { SWRFallback } from "@bera/berajs";
import { bexApiGraphqlClient } from "@bera/graphql";
import { GetPools, GetPoolsQuery } from "@bera/graphql/dex/api";

export const metadata: Metadata = {
  title: "Pools",
  description: "View pools",
};

export default async function Pool() {
  const res = await bexApiGraphqlClient.query<GetPoolsQuery>({
    query: GetPools,
    variables: {
      textSearch: undefined,
    },
  });
  return (
    <div className="flex w-full flex-col gap-5">
      <PoolPageHeader pools={res.data.poolGetPools} />
    </div>
  );
}
