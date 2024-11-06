import { gql } from "@apollo/client";

export const GetPoolEvents = gql`
  query GetPoolEvents($poolId: String!, $typeIn: [GqlPoolEventType!]!) {
    poolGetEvents(
      poolId: $poolId
      chain: BARTIO
      range: NINETY_DAYS
      typeIn: $typeIn
    ) {
      id
      valueUSD
      tx
      type
      sender
      timestamp
    }
  }
`;
gql`
  fragment MinimalPoolInList on GqlPoolMinimal {
    id
    name

    allTokens {
      address
      symbol
      name
      decimals
    }

    address
    protocolVersion
    type
    dynamicData {
      totalShares
      fees24h
      volume24h
      swapFee
      aprItems {
        apr
        id
      }
    }
  }

  fragment MinimalPool on GqlPoolBase {
    id
    name
    poolTokens {
      address
      symbol
      name
      decimals
    }
    address
    protocolVersion
    type
    dynamicData {
      totalShares
      totalLiquidity
      swapsCount
      fees24h
      volume24h
      swapFee
      aprItems {
        apr
        id
      }
    }
    userBalance {
      totalBalanceUsd
      walletBalance
      walletBalanceUsd
    }
  }
`;

export const GetPools = gql`
  query GetPools($textSearch: String, $userAddress: String) {
    poolGetPools(
      textSearch: $textSearch
      where: { userAddress: $userAddress }
    ) {
      ...MinimalPoolInList
    }
  }
`;
export const GetPool = gql`
  query GetPool($id: String!, $userAddress: String) {
    poolGetPool(id: $id, userAddress: $userAddress) {
      ...MinimalPool
    }
  }
`;
