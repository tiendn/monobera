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
