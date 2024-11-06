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
  fragment UserBalance on GqlPoolUserBalance {
    totalBalanceUsd
    walletBalance
    walletBalanceUsd
  }

  fragment DynamicData on GqlPoolDynamicData {
    totalShares
    fees24h
    volume24h
    swapFee
    totalLiquidity
    aprItems {
      apr
      id
    }
  }

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
      ...DynamicData
    }
    userBalance {
      ...UserBalance
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
      ...DynamicData
    }
    userBalance {
      ...UserBalance
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
