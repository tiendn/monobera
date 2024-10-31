import { bexApiGraphqlClient } from "@bera/graphql";
import {
  GetPoolEvents,
  GetPoolEventsQuery,
  GetPoolEventsQueryResult,
  GetPoolEventsQueryVariables,
  GqlPoolEventType,
} from "@bera/graphql/dex";
import useSWR from "swr";

export const usePoolEvents = (poolId: string | undefined) => {
  return useSWR<GetPoolEventsQueryResult["data"]>(
    poolId ? ["usePoolEvents", poolId] : null,
    async () => {
      const response = await bexApiGraphqlClient.query<GetPoolEventsQuery>({
        query: GetPoolEvents,
        variables: {
          poolId: poolId!,
          typeIn: [
            GqlPoolEventType.Swap,
            GqlPoolEventType.Add,
            GqlPoolEventType.Remove,
          ],
        } satisfies GetPoolEventsQueryVariables,
      });
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
      return response.data;
    },
  );
};
