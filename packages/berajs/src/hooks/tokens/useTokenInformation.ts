import {
  gasTokenDecimals,
  gasTokenName,
  gasTokenSymbol,
  nativeTokenAddress,
} from "@bera/config";
import useSWRImmutable from "swr/immutable";
import { isAddress } from "viem";
import { usePublicClient } from "wagmi";

import { getTokenInformation } from "~/actions";
import {
  DefaultHookOptions,
  DefaultHookReturnType,
  Token,
  useBeraJs,
} from "../..";

export type UseTokenInformationResponse = DefaultHookReturnType<
  Token | undefined
>;

export type useTokenInformationArgs = {
  address: string | undefined;
};
export const useTokenInformation = (
  args: useTokenInformationArgs,
  options?: DefaultHookOptions,
): UseTokenInformationResponse => {
  const publicClient = usePublicClient();
  const { config: beraConfig } = useBeraJs();
  const QUERY_KEY = args?.address ? [args.address, publicClient] : null;
  const swrResponse = useSWRImmutable<Token | undefined>(
    QUERY_KEY,
    async () => {
      if (!args?.address || !isAddress(args.address, { strict: false })) {
        throw new Error("Invalid address");
      }
      return await getTokenInformation({
        address: args.address,
        config: options?.beraConfigOverride ?? beraConfig,
        publicClient,
      });
    },
    { ...options?.opts },
  );

  return {
    ...swrResponse,
    refresh: () => swrResponse?.mutate?.(),
  };
};
