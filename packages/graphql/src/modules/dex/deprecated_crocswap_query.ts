import { gql } from "@apollo/client";

export const getTokenHoneyPriceReq = gql`
  query GetTokenHoneyPrice($id: String) {
    tokenHoneyPrice(id: $id) {
      id
      price
    }
  }
`;

export const getRecentSwaps = gql`
  query GetRecentSwaps($poolHash: Bytes!) {
    swaps(
      first: 50
      orderBy: time
      orderDirection: desc
      where: { pool: $poolHash }
    ) {
      user
      baseFlow
      quoteFlow
      transactionHash
      time
      baseAssetUsdPrice
      quoteAssetUsdPrice
    }
  }
`;

export const getRecentProvisions = gql`
  query GetRecentProvisions($poolHash: Bytes!) {
    liquidityChanges(
      first: 50
      orderBy: time
      orderDirection: desc
      where: { pool: $poolHash }
    ) {
      user
      baseFlow
      quoteFlow
      changeType
      transactionHash
      time
      baseAssetUsdPrice
      quoteAssetUsdPrice
    }
  }
`;

// NEW QUERIES

export const GetTokenInformation = gql`
  query GetTokenInformation($id: String) {
    tokenInformation(id: $id) {
      id
      address
      symbol
      name
      decimals
      usdValue
      beraValue
    }
  }
`;

export const GetTokenInformations = gql`
  query GetTokenInformation($id: [String!]) {
    tokenInformations(where: { id_in: $id }) {
      id
      address
      symbol
      name
      decimals
      usdValue
      beraValue
    }
  }
`;

export const GetWeeklyBgtInflation = gql`
  query BgtInflation($wbera: String) {
    globalIncentivesUsages(interval: "day", first: 7) {
      bgtDistributed
    }
    tokenInformation(id: $wbera) {
      usdValue
    }
  }
`;
