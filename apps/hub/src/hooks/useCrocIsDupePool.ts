import { type Token } from "@bera/berajs";
import { dexClient, getCrocSelectedPoolOLD } from "@bera/graphql";
import { mutate } from "swr";
import useSWRImmutable from "swr/immutable";

import { useCrocPoolFromTokens, useCrocToken } from "./useCrocPoolFromTokens";

export const useCrocIsDupePool = ({
  tokenA,
  tokenB,
  poolIdx,
}: {
  tokenA: Token | undefined;
  tokenB: Token | undefined;
  poolIdx: number;
}) => {
  const crocPool = useCrocPoolFromTokens();
  const QUERY_KEY = ["isDupePool", crocPool, poolIdx];
  const { isLoading, isValidating } = useSWRImmutable(QUERY_KEY, async () => {
    return undefined;
  });

  const useIsDupePool = () => {
    const { data = undefined } = useSWRImmutable<boolean | undefined>(
      QUERY_KEY,
    );
    return data;
  };

  return {
    isLoading: isLoading || isValidating,
    useIsDupePool,
    refresh: () => void mutate(QUERY_KEY),
  };
};
