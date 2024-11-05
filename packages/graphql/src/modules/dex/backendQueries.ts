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
  fragment MinimalPool on GqlPoolMinimal {
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
`;

export const GetPools = gql`
  query GetPools {
    poolGetPools {
      ...MinimalPool
    }
  }
`;
