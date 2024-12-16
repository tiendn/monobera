import { chainId, tokenListUrl } from "@bera/config";

import { Token } from "../../types/dex";
import { formatTokenList, tokenListToDict } from "../../utils/formatTokenList";

export interface GetTokensRequest {
  externalList?: Token[];
}

export interface GetTokens {
  tokenList?: Token[] | undefined;
  customTokenList?: Token[] | undefined;
  tokenDictionary?: { [key: string]: Token } | undefined;
  featuredTokenList?: Token[] | undefined;
}

export const getTokens = async ({
  externalList,
}: GetTokensRequest): Promise<GetTokens> => {
  console.log("getting tokens", externalList);
  if (!tokenListUrl) {
    return {
      tokenList: [],
      customTokenList: [...(externalList ?? [])],
      tokenDictionary: tokenListToDict(externalList ?? []),
      featuredTokenList: [],
    };
  }
  try {
    const tokenList = await fetch(tokenListUrl);
    const temp = await tokenList.json();
    return formatTokenList(temp.tokens, externalList ?? [], chainId);
  } catch (error) {
    console.error("Error fetching token list", error);
    return {
      tokenList: [...(externalList ?? [])],
      customTokenList: [...(externalList ?? [])],
      featuredTokenList: [],
      tokenDictionary: tokenListToDict(externalList ?? []),
    };
  }
};
